import {
  WEB_DATABASE_CHANNEL,
  type StoredWebProject,
  type ExternalSqliteReadResult,
  type WebBackupRecord,
  type WebDatabaseOperation,
  type WebDatabaseRequest,
  type WebDatabaseResponse,
  type WebLogRecord
} from './webDatabaseProtocol';
import webDatabaseWorkerUrl from './webDatabaseWorker.ts?worker&url';

interface PendingRequest {
  resolve(value: unknown): void;
  reject(reason: Error): void;
  timeoutId: number;
}

export interface WebDatabaseStatus {
  schemaVersion: string;
  sqliteVersion: string;
  storageMode: 'opfs-sahpool';
  capacity: number;
}

export class WebDatabaseClient extends EventTarget {
  readonly #worker: Worker;
  readonly #pending = new Map<string, PendingRequest>();
  readonly #channel: BroadcastChannel | null;

  constructor() {
    super();
    this.#worker = new Worker(webDatabaseWorkerUrl, { type: 'module' });
    this.#worker.addEventListener('message', event => this.#handleResponse(event.data as WebDatabaseResponse));
    this.#worker.addEventListener('error', event => {
      this.#rejectAll(new Error(event.message || '浏览器数据库 Worker 无法运行。'));
    });
    this.#channel = typeof BroadcastChannel === 'function'
      ? new BroadcastChannel(WEB_DATABASE_CHANNEL)
      : null;
    this.#channel?.addEventListener('message', event => {
      this.dispatchEvent(new CustomEvent('external-change', { detail: event.data }));
    });
  }

  #handleResponse(response: WebDatabaseResponse): void {
    const pending = this.#pending.get(response.id);
    if (!pending) return;
    window.clearTimeout(pending.timeoutId);
    this.#pending.delete(response.id);
    if (response.ok) pending.resolve(response.data);
    else {
      const error = new Error(response.error.message);
      Object.assign(error, { code: response.error.code });
      if (response.error.code === 'WEB_DATABASE_LOCKED') {
        window.dispatchEvent(new CustomEvent('cqnu:web-database-locked', {
          detail: { code: response.error.code, message: response.error.message }
        }));
      }
      pending.reject(error);
    }
  }

  #rejectAll(error: Error): void {
    this.#pending.forEach(pending => {
      window.clearTimeout(pending.timeoutId);
      pending.reject(error);
    });
    this.#pending.clear();
  }

  request<T>(
    operation: WebDatabaseOperation,
    payload?: unknown,
    transfer: Transferable[] = [],
    timeoutMs = 20_000
  ): Promise<T> {
    const id = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error('浏览器本地数据库操作超时。'));
      }, timeoutMs);
      this.#pending.set(id, {
        resolve: value => resolve(value as T),
        reject,
        timeoutId
      });
      const request: WebDatabaseRequest = { id, operation, payload };
      this.#worker.postMessage(request, transfer);
    });
  }

  initialize(): Promise<WebDatabaseStatus> {
    return this.request('initialize');
  }

  getProject(projectId: string): Promise<StoredWebProject | null> {
    return this.request('project:get', { projectId });
  }

  listProjects(): Promise<Array<Pick<StoredWebProject, 'projectId' | 'label' | 'modifiedAt' | 'sourceKind'>>> {
    return this.request('project:list');
  }

  putProject(project: StoredWebProject): Promise<StoredWebProject> {
    return this.request('project:put', {
      projectId: project.projectId,
      label: project.label,
      modifiedAt: project.modifiedAt,
      sourceKind: project.sourceKind,
      project: {
        settings: project.settings,
        zones: project.zones,
        points: project.points
      }
    });
  }

  deleteProject(projectId: string): Promise<{ deleted: boolean }> {
    return this.request('project:delete', { projectId });
  }

  createBackup(projectId: string, label: string): Promise<WebBackupRecord> {
    return this.request('backup:create', { projectId, label });
  }

  listBackups(projectId: string): Promise<WebBackupRecord[]> {
    return this.request('backup:list', { projectId });
  }

  getBackup(id: string): Promise<Record<string, unknown> | null> {
    return this.request('backup:get', { id });
  }

  deleteBackups(ids: string[]): Promise<{ deleted: number }> {
    return this.request('backup:delete', { ids });
  }

  appendLog(record: Partial<WebLogRecord>): Promise<WebLogRecord> {
    return this.request('log:append', record);
  }

  listLogs(projectId: string, limit = 80): Promise<WebLogRecord[]> {
    return this.request('log:list', { projectId, limit });
  }

  getLog(id: string): Promise<WebLogRecord | null> {
    return this.request('log:get', { id });
  }

  deleteLogs(ids: string[]): Promise<{ deleted: number }> {
    return this.request('log:delete', { ids });
  }

  exportDatabase(): Promise<Uint8Array> {
    return this.request<{ bytes: Uint8Array }>('database:export').then(result => result.bytes);
  }

  readExternalDatabase(bytes: ArrayBuffer): Promise<ExternalSqliteReadResult> {
    return this.request(
      'database:read-external',
      { bytes },
      [bytes],
      60_000
    );
  }

  close(): void {
    this.#channel?.close();
    this.#worker.terminate();
    this.#rejectAll(new Error('浏览器数据库连接已关闭。'));
  }
}

let singleton: Promise<WebDatabaseClient> | null = null;

export function getWebDatabaseClient(): Promise<WebDatabaseClient> {
  if (!singleton) {
    singleton = Promise.resolve(new WebDatabaseClient())
      .then(async client => {
        await client.initialize();
        return client;
      })
      .catch(error => {
        singleton = null;
        throw error;
      });
  }
  return singleton;
}
