import type { PlatformResponse } from '../../../shared/types/platform';
import {
  createProjectWorkflowController
} from './model';
import type {
  ProjectChooseResult,
  ProjectLoadedData,
  ProjectOpenMode,
  ProjectSaveResult,
  ProjectWorkflowController,
  ProjectWorkflowServices
} from './types';

declare global {
  interface Window {
    projectWorkflow?: ProjectWorkflowController;
  }
}

function asResponse<T>(value: Promise<PlatformResponse<unknown>>): Promise<PlatformResponse<T>> {
  return value as Promise<PlatformResponse<T>>;
}

function createWorkflowServices(): ProjectWorkflowServices {
  const adapter = window.platformAdapter;
  if (!adapter) throw new Error('Platform adapter must be installed before the project workflow.');

  return {
    chooseProject(mode: ProjectOpenMode) {
      const command = mode === 'portable-folder'
        ? adapter.project.choosePortableDir
        : adapter.project.chooseDir;
      if (typeof command !== 'function') {
        return Promise.resolve({
          ok: false,
          error: {
            code: 'PROJECT_FOLDER_PICKER_UNAVAILABLE',
            message: '当前环境不支持该文件夹选择方式。'
          }
        });
      }
      return asResponse<ProjectChooseResult>(command());
    },
    loadProject: payload => asResponse<ProjectLoadedData>(adapter.project.load(payload)),
    saveProject: payload => asResponse<ProjectSaveResult>(adapter.project.save(payload)),
    createBackup: payload => asResponse(adapter.backup.create(payload)),
    inspectBackup: payload => asResponse(adapter.backup.inspectRestore(payload)),
    restoreBackup: payload => asResponse(adapter.backup.restore(payload))
  };
}

export function installProjectWorkflowBridge(): ProjectWorkflowController {
  if (window.projectWorkflow) return window.projectWorkflow;
  const controller = createProjectWorkflowController(createWorkflowServices());
  Object.defineProperty(window, 'projectWorkflow', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: controller
  });
  document.documentElement.dataset.projectWorkflow = controller.version;
  return controller;
}
