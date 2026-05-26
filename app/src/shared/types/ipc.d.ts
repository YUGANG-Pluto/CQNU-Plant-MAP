export interface IpcSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type IpcResponse<T = unknown> = IpcSuccess<T> | IpcFailure;

export interface StorageConversionPayload {
  projectDir: string;
  backupDir?: string;
}

export interface StorageConversionCounts {
  settings: number;
  zones: number;
  points: number;
  phenologyEntries: number;
  imageReferences: number;
  taxonomyCandidates: number;
}

export interface StorageConversionPreflight {
  ok: boolean;
  version: string;
  projectDir: string;
  databaseExists: boolean;
  databaseFile: string;
  reportFile: string;
  counts: Record<string, number>;
  compatibility: Record<string, number>;
  safety: {
    backupRequired: boolean;
    writesProjectDatabase: boolean;
    keepsJsonFiles: boolean;
    rendererDatabaseAccess: false;
    exposesSql: false;
  };
  errors: string[];
  warnings: string[];
}

export interface StorageConversionReport {
  version: string;
  direction: 'json-to-sqlite' | 'sqlite-to-json' | string;
  generatedAt: string;
  databaseFile: string;
  reportFile: string;
  backupFile: string;
  projectChanged: boolean;
  rendererDatabaseAccess: false;
  exposesSql: false;
  sourceFormat: string;
  targetFormat: string;
  status: string;
  counts: StorageConversionCounts;
  schema: {
    ok: boolean;
    missingTables: string[];
    missingColumns: Record<string, string[]>;
  };
  warnings: string[];
}
