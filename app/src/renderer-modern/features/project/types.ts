import type {
  BackupCreatePayload,
  BackupCreateResult,
  BackupRestorePayload,
  BackupRestorePlan,
  BackupRestoreResult
} from '../../../shared/types/backup';
import type { PlatformResponse } from '../../../shared/types/platform';

export type ProjectStorageFormat = 'auto' | 'json' | 'sqlite';
export type ProjectOpenMode = 'directory' | 'portable-folder' | 'sqlite-file' | 'json-files';
export type ProjectWorkflowOperation =
  | 'open'
  | 'load'
  | 'save'
  | 'backup-create'
  | 'backup-inspect'
  | 'backup-restore';
export type ProjectWorkflowPhase =
  | 'idle'
  | 'choosing'
  | 'loading'
  | 'saving'
  | 'backing-up'
  | 'restoring'
  | 'ready'
  | 'error';

type UnknownRecord = Record<string, unknown>;

export interface ProjectChooseResult extends UnknownRecord {
  canceled: boolean;
  projectDir?: string;
  storageFormat?: ProjectStorageFormat;
}

export interface ProjectLoadPayload {
  projectDir: string;
  storageFormat?: ProjectStorageFormat;
}

export interface ProjectLoadedData extends UnknownRecord {
  projectDir: string;
  settings: UnknownRecord;
  zones: UnknownRecord[];
  points: UnknownRecord[];
  projectModifiedTime?: number;
  storageFormat?: ProjectStorageFormat;
  jsonFilesExist?: boolean;
  sqliteDatabaseExists?: boolean;
  webAccessLevel?: string;
  webDirectoryReconnectRequired?: boolean;
  webDirectoryPermissionStatus?: string;
  webProjectSourceKind?: string;
  webExternalSqliteImported?: boolean;
  webCloudProjectId?: string;
  webCloudRevision?: number;
  webCloudContentSha256?: string;
}

export interface ProjectSavePayload {
  projectDir: string;
  storageFormat?: ProjectStorageFormat;
  settings: UnknownRecord;
  zones: UnknownRecord[];
  points: UnknownRecord[];
}

export interface ProjectSaveResult extends UnknownRecord {
  projectModifiedTime?: number;
  storageFormat?: ProjectStorageFormat;
  jsonFilesExist?: boolean;
  sqliteDatabaseExists?: boolean;
}

export interface ProjectOpenOutcome {
  canceled: boolean;
  project?: ProjectLoadedData;
}

export interface ProjectWorkflowStatus {
  sequence: number;
  phase: ProjectWorkflowPhase;
  operation: ProjectWorkflowOperation | null;
  busy: boolean;
  errorCode: string;
}

export interface ProjectWorkflowServices {
  chooseProject(mode: ProjectOpenMode): Promise<PlatformResponse<ProjectChooseResult>>;
  loadProject(payload: ProjectLoadPayload): Promise<PlatformResponse<ProjectLoadedData>>;
  saveProject(payload: ProjectSavePayload): Promise<PlatformResponse<ProjectSaveResult>>;
  createBackup(payload: BackupCreatePayload): Promise<PlatformResponse<BackupCreateResult>>;
  inspectBackup(payload: BackupRestorePayload): Promise<PlatformResponse<BackupRestorePlan>>;
  restoreBackup(payload: BackupRestorePayload): Promise<PlatformResponse<BackupRestoreResult>>;
}

export interface ProjectWorkflowController {
  readonly version: 'project-workflow-v1';
  getStatus(): Readonly<ProjectWorkflowStatus>;
  subscribe(listener: (status: Readonly<ProjectWorkflowStatus>) => void): () => void;
  chooseAndLoad(options?: { mode?: ProjectOpenMode }): Promise<ProjectOpenOutcome>;
  load(payload: ProjectLoadPayload): Promise<ProjectLoadedData>;
  save(payload: ProjectSavePayload): Promise<ProjectSaveResult>;
  createBackup(payload: BackupCreatePayload): Promise<BackupCreateResult>;
  inspectBackup(payload: BackupRestorePayload): Promise<BackupRestorePlan>;
  restoreBackup(payload: BackupRestorePayload): Promise<BackupRestoreResult>;
}
