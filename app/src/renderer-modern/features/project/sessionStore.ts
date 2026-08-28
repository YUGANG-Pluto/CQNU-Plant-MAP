import type { PlatformRuntime } from '../../../shared/types/platform';
import type {
  ProjectDirectoryPermission,
  ProjectSessionAccess,
  ProjectSessionConnection,
  ProjectSessionLoadedInput,
  ProjectSessionSnapshot,
  ProjectSessionSource,
  ProjectSessionStore
} from './sessionTypes';

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanTime(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function normalizeSource(value: unknown, storageFormat: string, runtime: PlatformRuntime): ProjectSessionSource {
  const source = cleanText(value);
  if (source === 'directory' || source === 'import' || source === 'opfs' || source === 'sqlite' || source === 'cloud' || source === 'json') {
    return source;
  }
  if (runtime === 'electron') return 'desktop';
  if (storageFormat === 'sqlite') return 'sqlite';
  if (storageFormat === 'json') return 'json';
  return 'unknown';
}

function normalizeAccess(value: unknown): ProjectSessionAccess {
  const access = cleanText(value);
  return access === 'read' || access === 'edit' || access === 'save' ? access : 'unknown';
}

function normalizePermission(value: unknown): ProjectDirectoryPermission {
  const permission = cleanText(value);
  return permission === 'granted' || permission === 'prompt' || permission === 'denied' || permission === 'unavailable'
    ? permission
    : 'unknown';
}

function resolveConnection(
  runtime: PlatformRuntime,
  online: boolean,
  permission: ProjectDirectoryPermission,
  reconnectRequired: boolean
): ProjectSessionConnection {
  if (runtime === 'electron') return 'local';
  if (!online) return 'offline';
  if (reconnectRequired || permission === 'denied' || permission === 'prompt') return 'reconnect-required';
  return 'connected';
}

function initialSnapshot(runtime: PlatformRuntime, online: boolean): ProjectSessionSnapshot {
  return {
    version: 'project-session-v1',
    revision: 0,
    runtime,
    loaded: false,
    phase: 'idle',
    operation: null,
    busy: false,
    dirty: false,
    projectDir: '',
    storageFormat: 'auto',
    sourceKind: runtime === 'electron' ? 'desktop' : 'unknown',
    accessLevel: 'unknown',
    directoryPermissionStatus: 'unknown',
    directoryReconnectRequired: false,
    externalSqliteImported: false,
    jsonFilesExist: false,
    sqliteDatabaseExists: false,
    connection: runtime === 'electron' ? 'local' : online ? 'unknown' : 'offline',
    online,
    lastLoadedAt: 0,
    lastSavedAt: 0,
    errorCode: ''
  };
}

export function createProjectSessionStore(
  runtime: PlatformRuntime,
  initiallyOnline = true
): ProjectSessionStore {
  const listeners = new Set<(snapshot: Readonly<ProjectSessionSnapshot>) => void>();
  let snapshot: Readonly<ProjectSessionSnapshot> = Object.freeze(initialSnapshot(runtime, initiallyOnline));

  function publish(change: Partial<ProjectSessionSnapshot>): void {
    snapshot = Object.freeze({ ...snapshot, ...change, revision: snapshot.revision + 1 });
    listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch {
        // Session observers cannot interrupt project persistence or recovery.
      }
    });
  }

  function setLoadedProject(input: ProjectSessionLoadedInput): void {
    const storageFormat = input.storageFormat === 'sqlite' ? 'sqlite' : 'json';
    const permission = normalizePermission(input.webDirectoryPermissionStatus);
    const reconnectRequired = Boolean(input.webDirectoryReconnectRequired);
    publish({
      loaded: true,
      phase: 'ready',
      operation: null,
      busy: false,
      dirty: false,
      projectDir: cleanText(input.projectDir),
      storageFormat,
      sourceKind: normalizeSource(input.webProjectSourceKind, storageFormat, runtime),
      accessLevel: normalizeAccess(input.webAccessLevel),
      directoryPermissionStatus: permission,
      directoryReconnectRequired: reconnectRequired,
      externalSqliteImported: Boolean(input.webExternalSqliteImported),
      jsonFilesExist: Boolean(input.jsonFilesExist),
      sqliteDatabaseExists: Boolean(input.sqliteDatabaseExists),
      connection: resolveConnection(runtime, snapshot.online, permission, reconnectRequired),
      lastLoadedAt: Date.now(),
      lastSavedAt: cleanTime(input.projectModifiedTime, Date.now()),
      errorCode: ''
    });
  }

  const store: ProjectSessionStore = {
    version: 'project-session-v1',
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    applyWorkflowStatus(status) {
      publish({
        phase: status.phase,
        operation: status.operation,
        busy: status.busy,
        errorCode: status.errorCode
      });
    },
    setLoadedProject,
    setSavedProject(input) {
      const storageFormat = input.storageFormat === 'sqlite'
        ? 'sqlite'
        : input.storageFormat === 'json'
          ? 'json'
          : snapshot.storageFormat;
      publish({
        phase: 'ready',
        operation: null,
        busy: false,
        dirty: false,
        storageFormat,
        jsonFilesExist: typeof input.jsonFilesExist === 'boolean' ? input.jsonFilesExist : snapshot.jsonFilesExist,
        sqliteDatabaseExists: typeof input.sqliteDatabaseExists === 'boolean'
          ? input.sqliteDatabaseExists
          : snapshot.sqliteDatabaseExists,
        lastSavedAt: cleanTime(input.projectModifiedTime, Date.now()),
        errorCode: ''
      });
    },
    setDirty(dirty) {
      if (snapshot.dirty === Boolean(dirty)) return;
      publish({ dirty: Boolean(dirty) });
    },
    setOnline(online) {
      if (snapshot.online === online) return;
      publish({
        online,
        connection: resolveConnection(
          runtime,
          online,
          snapshot.directoryPermissionStatus,
          snapshot.directoryReconnectRequired
        )
      });
    },
    setDirectoryPermission(status, reconnectRequired = false) {
      const permission = normalizePermission(status);
      publish({
        directoryPermissionStatus: permission,
        directoryReconnectRequired: reconnectRequired,
        connection: resolveConnection(runtime, snapshot.online, permission, reconnectRequired)
      });
    },
    reportError(errorCode) {
      publish({ phase: 'error', operation: null, busy: false, errorCode: cleanText(errorCode) || 'PROJECT_SESSION_FAILED' });
    },
    reset() {
      const next = initialSnapshot(runtime, snapshot.online);
      publish(next);
    }
  };

  return Object.freeze(store);
}
