import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import sqliteWasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url';
import {
  WEB_DATABASE_CHANNEL,
  WEB_DATABASE_FILE,
  WEB_DATABASE_LOCK,
  WEB_DATABASE_SCHEMA_VERSION,
  type StoredWebProject,
  type WebDatabaseRequest,
  type WebDatabaseResponse,
  type WebLogRecord,
  type WebProjectRecord
} from './webDatabaseProtocol';
import {
  readExternalSqliteDatabase,
  type ExternalSqlitePool
} from './webExternalSqliteWorker';

interface SqliteDatabase {
  exec(input: string | {
    sql: string;
    bind?: unknown[];
    rowMode?: 'object';
    returnValue?: 'resultRows';
  }): unknown;
  close(): void;
}

interface SahPool extends ExternalSqlitePool {
  OpfsSAHPoolDb: new (filename: string) => SqliteDatabase;
  exportFile(filename: string): Promise<Uint8Array>;
}

interface SqliteRuntime {
  version: { libVersion: string };
  installOpfsSAHPoolVfs(options: {
    clearOnInit: boolean;
    initialCapacity: number;
    name: string;
    directory: string;
  }): Promise<SahPool>;
}

type SqliteInitializer = (options: {
  locateFile(fileName: string): string;
  print(...values: unknown[]): void;
  printErr(...values: unknown[]): void;
}) => Promise<SqliteRuntime>;

interface WorkerScope {
  onmessage: ((event: MessageEvent<WebDatabaseRequest>) => void) | null;
  postMessage(message: WebDatabaseResponse, transfer?: Transferable[]): void;
}

interface LockManagerLike {
  request(
    name: string,
    options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: unknown | null) => Promise<void>
  ): Promise<void>;
}

const workerScope = self as unknown as WorkerScope;
const updateChannel = typeof BroadcastChannel === 'function'
  ? new BroadcastChannel(WEB_DATABASE_CHANNEL)
  : null;

let database: SqliteDatabase | null = null;
let pool: SahPool | null = null;
let sqliteVersion = '';
let initialization: Promise<void> | null = null;

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS web_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS web_projects (
    project_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    modified_at INTEGER NOT NULL,
    source_kind TEXT NOT NULL,
    project_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS web_backups (
    backup_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES web_projects(project_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_web_backups_project_created
    ON web_backups(project_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS web_logs (
    log_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL DEFAULT '',
    ts TEXT NOT NULL,
    level TEXT NOT NULL,
    scope TEXT NOT NULL,
    message TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_web_logs_project_ts
    ON web_logs(project_id, ts DESC);
`;

function asRecord(value: unknown): WebProjectRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as WebProjectRecord
    : {};
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sourceKind(value: unknown): StoredWebProject['sourceKind'] {
  return ['directory', 'import', 'sqlite', 'cloud'].includes(text(value))
    ? text(value) as StoredWebProject['sourceKind']
    : 'opfs';
}

function cloudSource(value: unknown): StoredWebProject['cloudSource'] | undefined {
  const source = asRecord(value);
  const projectId = text(source.projectId);
  if (!projectId || !/^[A-Za-z0-9_-]{1,80}$/u.test(projectId)) return undefined;
  return {
    projectId,
    revision: Math.max(0, Math.trunc(number(source.revision))),
    contentSha256: text(source.contentSha256),
    syncedAt: text(source.syncedAt)
  };
}

function requireDatabase(): SqliteDatabase {
  if (!database) throw new Error('浏览器数据库尚未初始化。');
  return database;
}

function rows(sql: string, bind: unknown[] = []): WebProjectRecord[] {
  return databaseRows(requireDatabase(), sql, bind);
}

function databaseRows(db: SqliteDatabase, sql: string, bind: unknown[] = []): WebProjectRecord[] {
  const result = db.exec({
    sql,
    bind,
    rowMode: 'object',
    returnValue: 'resultRows'
  });
  return Array.isArray(result) ? result.filter(item => item && typeof item === 'object') as WebProjectRecord[] : [];
}

function execute(sql: string, bind: unknown[] = []): void {
  requireDatabase().exec({ sql, bind });
}

function parseJson(value: unknown, fallback: unknown): unknown {
  try {
    return JSON.parse(text(value)) as unknown;
  } catch {
    return fallback;
  }
}

function storedProjectFromRow(row: WebProjectRecord): StoredWebProject {
  const project = asRecord(parseJson(row.project_json, {}));
  const source = cloudSource(project.cloudSource);
  return {
    projectId: text(row.project_id),
    label: text(row.label),
    modifiedAt: number(row.modified_at),
    sourceKind: sourceKind(row.source_kind),
    ...(source ? { cloudSource: source } : {}),
    settings: asRecord(project.settings),
    zones: Array.isArray(project.zones) ? project.zones.filter(item => item && typeof item === 'object') as WebProjectRecord[] : [],
    points: Array.isArray(project.points) ? project.points.filter(item => item && typeof item === 'object') as WebProjectRecord[] : []
  };
}

function initializeSqlite(): Promise<void> {
  if (initialization) return initialization;
  initialization = new Promise((resolve, reject) => {
    const locks = (navigator as Navigator & { locks?: LockManagerLike }).locks;
    if (!locks) {
      reject(new Error('当前浏览器不支持 Web Locks，无法安全打开本地数据库。'));
      return;
    }
    void locks.request(
      WEB_DATABASE_LOCK,
      { mode: 'exclusive', ifAvailable: true },
      async lock => {
        if (!lock) {
          reject(new Error('浏览器本地数据库已被另一个工作区标签页占用。请关闭或退出另一标签页中的工作区后重试；站点首页和文档页不受影响。'));
          return;
        }
        try {
          const initializeModule = sqlite3InitModule as unknown as SqliteInitializer;
          const sqlite3 = await initializeModule({
            locateFile: fileName => fileName.endsWith('.wasm') ? sqliteWasmUrl : fileName,
            print: () => undefined,
            printErr: () => undefined
          });
          pool = await sqlite3.installOpfsSAHPoolVfs({
            clearOnInit: false,
            initialCapacity: 6,
            name: 'cqnu-plant-map-sahpool',
            directory: '/.cqnu-plant-map-sahpool'
          });
          database = new pool.OpfsSAHPoolDb(WEB_DATABASE_FILE);
          sqliteVersion = sqlite3.version.libVersion;
          database.exec(SCHEMA);
          execute(
            `INSERT INTO web_meta(key, value) VALUES('schema_version', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [WEB_DATABASE_SCHEMA_VERSION]
          );
          resolve();
          await new Promise<void>(() => undefined);
        } catch (error) {
          reject(error);
        }
      }
    ).catch(reject);
  });
  return initialization;
}

function putProject(payload: unknown): StoredWebProject {
  const source = asRecord(payload);
  const project = asRecord(source.project);
  const sourceMetadata = cloudSource(project.cloudSource);
  const stored: StoredWebProject = {
    projectId: text(source.projectId),
    label: text(source.label) || '浏览器本地项目',
    modifiedAt: number(source.modifiedAt, Date.now()),
    sourceKind: sourceKind(source.sourceKind),
    ...(sourceMetadata ? { cloudSource: sourceMetadata } : {}),
    settings: asRecord(project.settings),
    zones: Array.isArray(project.zones) ? project.zones.filter(item => item && typeof item === 'object') as WebProjectRecord[] : [],
    points: Array.isArray(project.points) ? project.points.filter(item => item && typeof item === 'object') as WebProjectRecord[] : []
  };
  if (!stored.projectId) throw new Error('项目标识不能为空。');
  execute(
    `INSERT INTO web_projects(project_id, label, modified_at, source_kind, project_json)
     VALUES(?, ?, ?, ?, ?)
     ON CONFLICT(project_id) DO UPDATE SET
       label = excluded.label,
       modified_at = excluded.modified_at,
       source_kind = excluded.source_kind,
       project_json = excluded.project_json`,
    [
      stored.projectId,
      stored.label,
      stored.modifiedAt,
      stored.sourceKind,
      JSON.stringify({
        ...(stored.cloudSource ? { cloudSource: stored.cloudSource } : {}),
        settings: stored.settings,
        zones: stored.zones,
        points: stored.points
      })
    ]
  );
  updateChannel?.postMessage({ type: 'project-changed', projectId: stored.projectId, modifiedAt: stored.modifiedAt });
  return stored;
}

function getProject(payload: unknown): StoredWebProject | null {
  const projectId = text(asRecord(payload).projectId);
  const row = rows('SELECT * FROM web_projects WHERE project_id = ?', [projectId])[0];
  return row ? storedProjectFromRow(row) : null;
}

function listProjects(): Array<Pick<StoredWebProject, 'projectId' | 'label' | 'modifiedAt' | 'sourceKind'>> {
  return rows('SELECT project_id, label, modified_at, source_kind FROM web_projects ORDER BY modified_at DESC')
    .map(row => ({
      projectId: text(row.project_id),
      label: text(row.label),
      modifiedAt: number(row.modified_at),
      sourceKind: sourceKind(row.source_kind)
    }));
}

function createBackup(payload: unknown): WebProjectRecord {
  const source = asRecord(payload);
  const project = getProject({ projectId: source.projectId });
  if (!project) throw new Error('当前项目不存在，无法创建备份。');
  const createdAt = Date.now();
  const id = text(source.id) || `web_backup_${createdAt}_${crypto.randomUUID()}`;
  const label = text(source.label) || 'manual';
  const name = text(source.name) || `cqnu_web_backup_${new Date(createdAt).toISOString().replace(/[:.]/g, '-')}.json`;
  const snapshot = JSON.stringify(project);
  execute(
    `INSERT INTO web_backups(backup_id, project_id, name, label, created_at, snapshot_json)
     VALUES(?, ?, ?, ?, ?, ?)`,
    [id, project.projectId, name, label, createdAt, snapshot]
  );
  return { id, projectId: project.projectId, name, label, createdAt, size: new Blob([snapshot]).size };
}

function listBackups(payload: unknown): WebProjectRecord[] {
  const projectId = text(asRecord(payload).projectId);
  return rows(
    `SELECT backup_id, project_id, name, label, created_at, length(snapshot_json) AS size
     FROM web_backups WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  ).map(row => ({
    id: text(row.backup_id),
    projectId: text(row.project_id),
    name: text(row.name),
    label: text(row.label),
    createdAt: number(row.created_at),
    size: number(row.size)
  }));
}

function getBackup(payload: unknown): WebProjectRecord | null {
  const id = text(asRecord(payload).id);
  const row = rows('SELECT * FROM web_backups WHERE backup_id = ?', [id])[0];
  if (!row) return null;
  return {
    id: text(row.backup_id),
    projectId: text(row.project_id),
    name: text(row.name),
    label: text(row.label),
    createdAt: number(row.created_at),
    snapshot: parseJson(row.snapshot_json, {})
  };
}

function deleteBackups(payload: unknown): { deleted: number } {
  const ids = Array.isArray(asRecord(payload).ids)
    ? (asRecord(payload).ids as unknown[]).map(text).filter(Boolean)
    : [];
  let deleted = 0;
  ids.forEach(id => {
    execute('DELETE FROM web_backups WHERE backup_id = ?', [id]);
    deleted += 1;
  });
  return { deleted };
}

function appendLog(payload: unknown): WebLogRecord {
  const source = asRecord(payload);
  const record: WebLogRecord = {
    id: text(source.id) || `web_log_${Date.now()}_${crypto.randomUUID()}`,
    projectId: text(source.projectId),
    ts: text(source.ts) || new Date().toISOString(),
    level: text(source.level) || 'info',
    scope: text(source.scope) || 'web',
    message: text(source.message).slice(0, 2000),
    details: asRecord(source.details)
  };
  execute(
    `INSERT INTO web_logs(log_id, project_id, ts, level, scope, message, details_json)
     VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [record.id, record.projectId, record.ts, record.level, record.scope, record.message, JSON.stringify(record.details)]
  );
  return record;
}

function listLogs(payload: unknown): WebProjectRecord[] {
  const source = asRecord(payload);
  const projectId = text(source.projectId);
  const limit = Math.max(1, Math.min(500, number(source.limit, 80)));
  return rows(
    `SELECT log_id, project_id, ts, level, scope, message
     FROM web_logs WHERE (? = '' OR project_id = ?) ORDER BY ts DESC LIMIT ?`,
    [projectId, projectId, limit]
  ).map(row => ({
    id: text(row.log_id),
    projectId: text(row.project_id),
    ts: text(row.ts),
    level: text(row.level),
    scope: text(row.scope),
    message: text(row.message),
    fileName: `browser-${text(row.ts).slice(0, 10)}.log`
  }));
}

function getLog(payload: unknown): WebProjectRecord | null {
  const id = text(asRecord(payload).id);
  const row = rows('SELECT * FROM web_logs WHERE log_id = ?', [id])[0];
  if (!row) return null;
  return {
    id: text(row.log_id),
    projectId: text(row.project_id),
    ts: text(row.ts),
    level: text(row.level),
    scope: text(row.scope),
    message: text(row.message),
    details: parseJson(row.details_json, {})
  };
}

function deleteLogs(payload: unknown): { deleted: number } {
  const ids = Array.isArray(asRecord(payload).ids)
    ? (asRecord(payload).ids as unknown[]).map(text).filter(Boolean)
    : [];
  ids.forEach(id => execute('DELETE FROM web_logs WHERE log_id = ?', [id]));
  return { deleted: ids.length };
}

async function dispatch(request: WebDatabaseRequest): Promise<unknown> {
  await initializeSqlite();
  switch (request.operation) {
    case 'initialize':
      return {
        schemaVersion: WEB_DATABASE_SCHEMA_VERSION,
        sqliteVersion,
        storageMode: 'opfs-sahpool',
        capacity: pool?.getCapacity() || 0
      };
    case 'project:get': return getProject(request.payload);
    case 'project:list': return listProjects();
    case 'project:put': return putProject(request.payload);
    case 'project:delete': {
      const projectId = text(asRecord(request.payload).projectId);
      execute('DELETE FROM web_projects WHERE project_id = ?', [projectId]);
      updateChannel?.postMessage({ type: 'project-deleted', projectId });
      return { deleted: Boolean(projectId) };
    }
    case 'backup:create': return createBackup(request.payload);
    case 'backup:get': return getBackup(request.payload);
    case 'backup:list': return listBackups(request.payload);
    case 'backup:delete': return deleteBackups(request.payload);
    case 'log:append': return appendLog(request.payload);
    case 'log:list': return listLogs(request.payload);
    case 'log:get': return getLog(request.payload);
    case 'log:delete': return deleteLogs(request.payload);
    case 'database:export': {
      if (!pool) throw new Error('浏览器数据库尚未初始化。');
      const bytes = await pool.exportFile(WEB_DATABASE_FILE);
      return { bytes };
    }
    case 'database:read-external': {
      if (!pool) throw new Error('浏览器数据库尚未初始化。');
      return readExternalSqliteDatabase(pool, request.payload);
    }
    default:
      throw new Error('不支持的浏览器数据库操作。');
  }
}

function errorResponse(id: string, error: unknown): WebDatabaseResponse {
  const rawMessage = error instanceof Error ? error.message : '浏览器本地数据库操作失败。';
  const message = rawMessage
    .replace(/data:[^\s'"\)]+/gi, 'data:[embedded-resource-omitted]')
    .slice(0, 1200);
  const locked = message.includes('另一个工作区标签页') || message.includes('另一个标签页');
  return {
    id,
    ok: false,
    error: {
      code: locked ? 'WEB_DATABASE_LOCKED' : 'WEB_DATABASE_ERROR',
      message
    }
  };
}

workerScope.onmessage = event => {
  const request = event.data;
  void dispatch(request)
    .then(data => {
      const response: WebDatabaseResponse = { id: request.id, ok: true, data };
      const bytes = asRecord(data).bytes;
      workerScope.postMessage(response, bytes instanceof Uint8Array ? [bytes.buffer] : []);
    })
    .catch(error => workerScope.postMessage(errorResponse(request.id, error)));
};
