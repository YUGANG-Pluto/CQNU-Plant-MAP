export interface BackupManifest {
  version?: string;
  createdAt?: string;
  projectName?: string;
  projectDir?: string;
  files?: Array<{
    path: string;
    size?: number;
    hash?: string;
  }>;
  notes?: string[];
  [key: string]: unknown;
}

export interface BackupFileItem {
  name: string;
  path: string;
  backupDir: string;
  size?: number;
  mtimeMs?: number;
  modifiedAt?: string;
}

export interface BackupCreatePayload {
  projectDir: string;
  backupDir?: string;
  label?: string;
}

export interface BackupCreateResult {
  filePath: string;
  backupDir: string;
}

export interface BackupListPayload {
  projectDir: string;
  backupDir?: string;
  days?: number | string;
  paths?: string[];
}

export interface BackupListResult {
  backupDir?: string;
  items: BackupFileItem[];
}

export interface BackupRestorePayload {
  projectDir: string;
  backupDir?: string;
  backupName?: string;
  backupPath?: string;
  confirmRestore?: boolean;
}

export interface BackupRestoreEntry {
  entryName: string;
  relativePath: string;
  targetPath: string;
  size: number;
}

export interface BackupRestorePlan {
  ok: boolean;
  version: string;
  backupFile: string;
  backupName: string;
  projectDir: string;
  rootNames: string[];
  entryCount: number;
  restoreFileCount: number;
  skippedBackupEntries: number;
  totalBytes: number;
  hasSqliteStorage: boolean;
  hasJsonStorage: boolean;
  createsSafetyBackup: boolean;
  requiresRestoreConfirmation: boolean;
  warnings: string[];
  plannedEntries: BackupRestoreEntry[];
}

export interface BackupRestoreResult {
  status: 'completed';
  version: string;
  backupFile: string;
  backupName: string;
  safetyBackupFile: string;
  restoredFileCount: number;
  removedStorageFiles: string[];
  hasSqliteStorage: boolean;
  hasJsonStorage: boolean;
  skippedBackupEntries: number;
  warnings: string[];
}
