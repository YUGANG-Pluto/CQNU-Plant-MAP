import type { PlatformRuntime } from '../../../shared/types/platform';
import type {
  ProjectLoadedData,
  ProjectSaveResult,
  ProjectStorageFormat,
  ProjectWorkflowStatus
} from './types';

export type ProjectSessionSource = 'desktop' | 'directory' | 'import' | 'opfs' | 'sqlite' | 'json' | 'unknown';
export type ProjectSessionAccess = 'read' | 'edit' | 'save' | 'unknown';
export type ProjectDirectoryPermission = 'granted' | 'prompt' | 'denied' | 'unavailable' | 'unknown';
export type ProjectSessionConnection = 'local' | 'connected' | 'offline' | 'reconnect-required' | 'unknown';

export interface ProjectSessionSnapshot {
  version: 'project-session-v1';
  revision: number;
  runtime: PlatformRuntime;
  loaded: boolean;
  phase: ProjectWorkflowStatus['phase'];
  operation: ProjectWorkflowStatus['operation'];
  busy: boolean;
  dirty: boolean;
  projectDir: string;
  storageFormat: ProjectStorageFormat;
  sourceKind: ProjectSessionSource;
  accessLevel: ProjectSessionAccess;
  directoryPermissionStatus: ProjectDirectoryPermission;
  directoryReconnectRequired: boolean;
  externalSqliteImported: boolean;
  jsonFilesExist: boolean;
  sqliteDatabaseExists: boolean;
  connection: ProjectSessionConnection;
  online: boolean;
  lastLoadedAt: number;
  lastSavedAt: number;
  errorCode: string;
}

export interface ProjectSessionLoadedInput extends ProjectLoadedData {
  webAccessLevel?: string;
  webDirectoryPermissionStatus?: string;
  webDirectoryReconnectRequired?: boolean;
  webProjectSourceKind?: string;
  webExternalSqliteImported?: boolean;
}

export interface ProjectSessionStore {
  readonly version: 'project-session-v1';
  getSnapshot(): Readonly<ProjectSessionSnapshot>;
  subscribe(listener: (snapshot: Readonly<ProjectSessionSnapshot>) => void): () => void;
  applyWorkflowStatus(status: Readonly<ProjectWorkflowStatus>): void;
  setLoadedProject(input: ProjectSessionLoadedInput): void;
  setSavedProject(input: ProjectSaveResult): void;
  setDirty(dirty: boolean): void;
  setOnline(online: boolean): void;
  setDirectoryPermission(status: string, reconnectRequired?: boolean): void;
  reportError(errorCode: string): void;
  reset(): void;
}
