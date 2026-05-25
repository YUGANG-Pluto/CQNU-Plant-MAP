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
