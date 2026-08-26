import type { PlatformResponse } from '../../../shared/types/platform';
import type {
  ProjectOpenMode,
  ProjectOpenOutcome,
  ProjectWorkflowController,
  ProjectWorkflowOperation,
  ProjectWorkflowPhase,
  ProjectWorkflowServices,
  ProjectWorkflowStatus
} from './types';

export class ProjectWorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ProjectWorkflowError';
    this.code = code;
  }
}

export function unwrapProjectResponse<T>(response: PlatformResponse<T>): T {
  if (response?.ok === true) return response.data;
  const error = response?.error;
  throw new ProjectWorkflowError(
    error?.code || 'PROJECT_WORKFLOW_FAILED',
    error?.message || '项目操作失败。'
  );
}

function normalizeWorkflowError(error: unknown, fallbackCode: string): ProjectWorkflowError {
  if (error instanceof ProjectWorkflowError) return error;
  const source = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown }
    : {};
  return new ProjectWorkflowError(
    typeof source.code === 'string' && source.code ? source.code : fallbackCode,
    typeof source.message === 'string' && source.message ? source.message : '项目操作失败。'
  );
}

function requireProjectDir(value: unknown): string {
  const projectDir = typeof value === 'string' ? value.trim() : '';
  if (!projectDir) {
    throw new ProjectWorkflowError('PROJECT_DIRECTORY_MISSING', '项目目录无效。');
  }
  return projectDir;
}

export function createProjectWorkflowController(
  services: ProjectWorkflowServices
): ProjectWorkflowController {
  const listeners = new Set<(status: Readonly<ProjectWorkflowStatus>) => void>();
  let sequence = 0;
  let stablePhase: ProjectWorkflowPhase = 'idle';
  let status: Readonly<ProjectWorkflowStatus> = Object.freeze({
    sequence,
    phase: stablePhase,
    operation: null,
    busy: false,
    errorCode: ''
  });

  function publish(next: ProjectWorkflowStatus): void {
    status = Object.freeze(next);
    listeners.forEach(listener => {
      try {
        listener(status);
      } catch {
        // Observers cannot interrupt project persistence or recovery.
      }
    });
  }

  function begin(operation: ProjectWorkflowOperation, phase: ProjectWorkflowPhase): number {
    if (status.busy) {
      throw new ProjectWorkflowError(
        'PROJECT_WORKFLOW_BUSY',
        '另一项项目操作正在进行，请稍后重试。'
      );
    }
    sequence += 1;
    publish({ sequence, phase, operation, busy: true, errorCode: '' });
    return sequence;
  }

  function transition(token: number, phase: ProjectWorkflowPhase): void {
    if (status.sequence !== token || !status.busy) return;
    publish({ ...status, phase });
  }

  function complete(token: number, phase: ProjectWorkflowPhase): void {
    if (status.sequence !== token) return;
    stablePhase = phase;
    publish({ sequence: token, phase, operation: null, busy: false, errorCode: '' });
  }

  function fail(token: number, error: ProjectWorkflowError): void {
    if (status.sequence !== token) return;
    publish({
      sequence: token,
      phase: 'error',
      operation: null,
      busy: false,
      errorCode: error.code
    });
  }

  async function execute<T>(
    operation: ProjectWorkflowOperation,
    phase: ProjectWorkflowPhase,
    task: () => Promise<T>,
    successPhase = stablePhase
  ): Promise<T> {
    const token = begin(operation, phase);
    try {
      const result = await task();
      complete(token, successPhase);
      return result;
    } catch (error) {
      const normalized = normalizeWorkflowError(error, `PROJECT_${operation.toUpperCase().replaceAll('-', '_')}_FAILED`);
      fail(token, normalized);
      throw normalized;
    }
  }

  async function chooseAndLoad(
    options: { mode?: ProjectOpenMode } = {}
  ): Promise<ProjectOpenOutcome> {
    const previousStablePhase = stablePhase;
    const token = begin('open', 'choosing');
    try {
      const mode = options.mode === 'portable-folder' ? 'portable-folder' : 'directory';
      // The picker is invoked before the first await so Chromium retains transient user activation.
      const pendingSelection = services.chooseProject(mode);
      const selection = unwrapProjectResponse(await pendingSelection);
      if (selection.canceled) {
        complete(token, previousStablePhase);
        return { canceled: true };
      }

      const projectDir = requireProjectDir(selection.projectDir);
      transition(token, 'loading');
      const project = unwrapProjectResponse(await services.loadProject({
        projectDir,
        storageFormat: selection.storageFormat || 'auto'
      }));
      requireProjectDir(project.projectDir);
      complete(token, 'ready');
      return { canceled: false, project };
    } catch (error) {
      const normalized = normalizeWorkflowError(error, 'PROJECT_OPEN_FAILED');
      fail(token, normalized);
      throw normalized;
    }
  }

  const controller: ProjectWorkflowController = {
    version: 'project-workflow-v1',
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      listener(status);
      return () => listeners.delete(listener);
    },
    chooseAndLoad,
    load: payload => execute('load', 'loading', async () => {
      const projectDir = requireProjectDir(payload.projectDir);
      const project = unwrapProjectResponse(await services.loadProject({ ...payload, projectDir }));
      requireProjectDir(project.projectDir);
      return project;
    }, 'ready'),
    save: payload => execute('save', 'saving', async () => {
      const projectDir = requireProjectDir(payload.projectDir);
      return unwrapProjectResponse(await services.saveProject({ ...payload, projectDir }));
    }, 'ready'),
    createBackup: payload => execute(
      'backup-create',
      'backing-up',
      async () => unwrapProjectResponse(await services.createBackup({
        ...payload,
        projectDir: requireProjectDir(payload.projectDir)
      }))
    ),
    inspectBackup: payload => execute(
      'backup-inspect',
      'backing-up',
      async () => unwrapProjectResponse(await services.inspectBackup({
        ...payload,
        projectDir: requireProjectDir(payload.projectDir)
      }))
    ),
    restoreBackup: payload => execute(
      'backup-restore',
      'restoring',
      async () => unwrapProjectResponse(await services.restoreBackup({
        ...payload,
        projectDir: requireProjectDir(payload.projectDir)
      })),
      'ready'
    )
  };

  return Object.freeze(controller);
}
