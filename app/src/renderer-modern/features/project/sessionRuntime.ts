import { createProjectSessionStore } from './sessionStore';
import type { ProjectSessionLoadedInput, ProjectSessionSnapshot, ProjectSessionStore } from './sessionTypes';
import type { ProjectSaveResult } from './types';

declare global {
  interface Window {
    projectSessionStore?: ProjectSessionStore;
  }
}

function mirrorCompatibilityDataset(snapshot: Readonly<ProjectSessionSnapshot>): void {
  const dataset = document.documentElement.dataset;
  dataset.projectSession = snapshot.version;
  dataset.projectLoaded = String(snapshot.loaded);
  dataset.projectSourceKind = snapshot.sourceKind;
  dataset.cloudProjectId = snapshot.cloudProjectId;
  dataset.cloudProjectRevision = String(snapshot.cloudRevision);
  dataset.projectStorageFormat = snapshot.storageFormat;
  dataset.projectDirectoryPermission = snapshot.directoryPermissionStatus;
  dataset.projectDirectoryReconnect = String(snapshot.directoryReconnectRequired);
  dataset.projectExternalSqlite = String(snapshot.externalSqliteImported);
  dataset.projectSessionPhase = snapshot.phase;
  dataset.projectConnection = snapshot.connection;
  dataset.projectDirty = String(snapshot.dirty);
}

function projectLoadedDetail(snapshot: Readonly<ProjectSessionSnapshot>): Record<string, unknown> {
  return {
    projectDir: snapshot.projectDir,
    storageFormat: snapshot.storageFormat,
    webAccessLevel: snapshot.accessLevel,
    sourceKind: snapshot.sourceKind,
    cloudProjectId: snapshot.cloudProjectId,
    cloudRevision: snapshot.cloudRevision,
    cloudContentSha256: snapshot.cloudContentSha256,
    directoryPermissionStatus: snapshot.directoryPermissionStatus,
    directoryReconnectRequired: snapshot.directoryReconnectRequired,
    externalSqliteImported: snapshot.externalSqliteImported,
    jsonFilesExist: snapshot.jsonFilesExist,
    sqliteDatabaseExists: snapshot.sqliteDatabaseExists
  };
}

export function installProjectSessionStore(): ProjectSessionStore {
  if (window.projectSessionStore) return window.projectSessionStore;
  const runtime = window.platformAdapter?.runtime === 'web' ? 'web' : 'electron';
  const online = runtime === 'electron' || navigator.onLine !== false;
  const core = createProjectSessionStore(runtime, online);
  const store: ProjectSessionStore = Object.freeze({
    ...core,
    setLoadedProject(input: ProjectSessionLoadedInput) {
      core.setLoadedProject(input);
      window.dispatchEvent(new CustomEvent('cqnu:project-loaded', {
        detail: projectLoadedDetail(core.getSnapshot())
      }));
    },
    setSavedProject(input: ProjectSaveResult) {
      core.setSavedProject(input);
      window.dispatchEvent(new CustomEvent('cqnu:project-saved', {
        detail: projectLoadedDetail(core.getSnapshot())
      }));
    }
  });

  Object.defineProperty(window, 'projectSessionStore', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: store
  });
  store.subscribe(mirrorCompatibilityDataset);
  window.addEventListener('online', () => store.setOnline(true));
  window.addEventListener('offline', () => store.setOnline(false));
  return store;
}
