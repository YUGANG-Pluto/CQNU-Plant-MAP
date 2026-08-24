export interface SqliteTableRow {
  internalKey?: string;
  sourceIndex?: number;
  compatJson?: string;
  presentFieldsJson?: string;
  [key: string]: unknown;
}

export type SqliteTableName =
  | 'project_settings'
  | 'zones'
  | 'points'
  | 'phenology_entries'
  | 'images'
  | 'taxonomy_candidates';

export interface SqliteTables {
  project_settings: SqliteTableRow[];
  zones: SqliteTableRow[];
  points: SqliteTableRow[];
  phenology_entries: SqliteTableRow[];
  images: SqliteTableRow[];
  taxonomy_candidates: SqliteTableRow[];
}

export interface SqliteTableModel {
  version: string;
  generatedAt: string;
  tables: SqliteTables;
  report?: {
    zoneCount: number;
    pointCount: number;
    phenologyEntryCount: number;
    imageReferenceCount: number;
    taxonomyCandidateCount: number;
    warnings: string[];
  };
}

export interface SqliteTableModelInput {
  version?: string;
  generatedAt?: string;
  tables?: Partial<Record<SqliteTableName, SqliteTableRow[]>>;
  report?: Partial<NonNullable<SqliteTableModel['report']>>;
}

export interface ConversionReport {
  version: string;
  direction: string;
  generatedAt: string;
  sourceFormat: string;
  targetFormat: string;
  status: 'ready-for-preflight' | 'blocked' | string;
  counts: Record<string, number>;
  compatibility: Record<string, number>;
  privacy: Record<string, boolean>;
  safety: Record<string, boolean>;
  warnings: string[];
}

export interface BackupPreflightPlan {
  version: string;
  type: 'backup-preflight-plan';
  generatedAt: string;
  direction: string;
  required: boolean;
  executeBackup: boolean;
  writeFiles: boolean;
  reason: string;
  includeRelativePaths: string[];
  excludePatterns: string[];
  steps: string[];
  validationGates: string[];
  privacy: Record<string, boolean>;
}
