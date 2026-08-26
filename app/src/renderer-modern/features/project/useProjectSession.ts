import { useEffect, useState } from 'preact/hooks';
import type { ProjectSessionSnapshot } from './sessionTypes';

const FALLBACK_SESSION: Readonly<ProjectSessionSnapshot> = Object.freeze({
  version: 'project-session-v1',
  revision: 0,
  runtime: 'web',
  loaded: false,
  phase: 'idle',
  operation: null,
  busy: false,
  dirty: false,
  projectDir: '',
  storageFormat: 'auto',
  sourceKind: 'unknown',
  accessLevel: 'unknown',
  directoryPermissionStatus: 'unknown',
  directoryReconnectRequired: false,
  externalSqliteImported: false,
  jsonFilesExist: false,
  sqliteDatabaseExists: false,
  connection: 'unknown',
  online: true,
  lastLoadedAt: 0,
  lastSavedAt: 0,
  errorCode: ''
});

export function useProjectSession(): Readonly<ProjectSessionSnapshot> {
  const store = window.projectSessionStore;
  const [snapshot, setSnapshot] = useState<Readonly<ProjectSessionSnapshot>>(
    store?.getSnapshot() ?? FALLBACK_SESSION
  );

  useEffect(() => store?.subscribe(setSnapshot), [store]);
  return snapshot;
}
