import type {
  CloudProjectDocument,
  CloudProjectMetadata,
  CloudProjectRevisionMetadata,
  CloudProjectSnapshot,
  CloudProjectUsage
} from '../../../shared/types/cloud-projects';
import type { CloudProjectSnapshotDiff } from './cloudProjectDiff';

export type CloudProjectStatusTone = 'neutral' | 'busy' | 'success' | 'error';
export type CloudProjectConflictOperation = 'upload' | 'rename' | 'restore' | 'delete';
export type CloudProjectText = (key: string, fallback: string) => string;

export interface CloudProjectConflictState {
  project: CloudProjectMetadata;
  operation: CloudProjectConflictOperation;
  localSnapshot: CloudProjectSnapshot | null;
  remoteDocument: CloudProjectDocument | null;
  diff: CloudProjectSnapshotDiff | null;
  loading: boolean;
}

export interface CloudProjectRevisionComparisonState {
  projectId: string;
  revision: number;
  diff: CloudProjectSnapshotDiff | null;
  loading: boolean;
}

export interface CloudProjectLibraryController {
  projects: CloudProjectMetadata[];
  usage: CloudProjectUsage;
  historyProjectId: string;
  revisions: CloudProjectRevisionMetadata[];
  historyLoading: boolean;
  historyComparison: CloudProjectRevisionComparisonState | null;
  renameId: string;
  renameValue: string;
  name: string;
  status: string;
  tone: CloudProjectStatusTone;
  busyId: string;
  loading: boolean;
  currentSnapshot: CloudProjectSnapshot | null;
  activeCloudProjectId: string;
  conflict: CloudProjectConflictState | null;
  canBackupConflict: boolean;
  setName(value: string): void;
  setRenameValue(value: string): void;
  refresh(): Promise<void>;
  createProject(event: Event): Promise<void>;
  uploadCurrent(project: CloudProjectMetadata): Promise<void>;
  beginRename(project: CloudProjectMetadata): void;
  cancelRename(): void;
  renameProject(event: Event, project: CloudProjectMetadata): Promise<void>;
  toggleHistory(project: CloudProjectMetadata): Promise<void>;
  compareRevision(project: CloudProjectMetadata, revision: CloudProjectRevisionMetadata): Promise<void>;
  restoreRevision(project: CloudProjectMetadata, revision: CloudProjectRevisionMetadata): Promise<void>;
  deleteProject(project: CloudProjectMetadata): Promise<void>;
  openProject(project: CloudProjectMetadata): Promise<void>;
  compareConflict(): Promise<void>;
  keepLocalConflict(): void;
  openLatestConflict(createBackup: boolean): Promise<void>;
}
