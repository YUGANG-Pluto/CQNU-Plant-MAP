import type { CloudProjectSourceMetadata } from '../../../shared/types/cloud-projects';

export const WEB_DATABASE_SCHEMA_VERSION = 'cqnu-web-local-v1';
export const WEB_DATABASE_FILE = '/cqnu-plant-map-web.sqlite3';
export const WEB_DATABASE_LOCK = 'cqnu-plant-map-web-database';
export const WEB_DATABASE_CHANNEL = 'cqnu-plant-map-web-updates';

export type WebProjectSourceKind = 'opfs' | 'directory' | 'import' | 'sqlite' | 'cloud';

export type WebProjectRecord = Record<string, unknown>;

export interface WebProjectDocument {
  settings: WebProjectRecord;
  zones: WebProjectRecord[];
  points: WebProjectRecord[];
}

export interface StoredWebProject extends WebProjectDocument {
  projectId: string;
  label: string;
  modifiedAt: number;
  sourceKind: WebProjectSourceKind;
  cloudSource?: CloudProjectSourceMetadata;
}

export type ExternalSqliteFormat = 'desktop-project' | 'web-projects';

export interface ExternalSqliteReadResult {
  format: ExternalSqliteFormat;
  bytesRead: number;
  quickCheck: 'ok';
  projectCount: number;
  warnings: string[];
  tables?: Record<string, WebProjectRecord[]>;
  project?: StoredWebProject;
}

export interface WebBackupRecord {
  id: string;
  projectId: string;
  name: string;
  label: string;
  createdAt: number;
  size: number;
  imageCount?: number;
  missingImageCount?: number;
}

export interface WebLogRecord {
  id: string;
  projectId: string;
  ts: string;
  level: string;
  scope: string;
  message: string;
  details?: WebProjectRecord;
}

export type WebDatabaseOperation =
  | 'initialize'
  | 'project:get'
  | 'project:list'
  | 'project:put'
  | 'project:delete'
  | 'backup:create'
  | 'backup:get'
  | 'backup:list'
  | 'backup:delete'
  | 'log:append'
  | 'log:list'
  | 'log:get'
  | 'log:delete'
  | 'database:export'
  | 'database:read-external';

export interface WebDatabaseRequest {
  id: string;
  operation: WebDatabaseOperation;
  payload?: unknown;
}

export interface WebDatabaseSuccess {
  id: string;
  ok: true;
  data: unknown;
}

export interface WebDatabaseFailure {
  id: string;
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type WebDatabaseResponse = WebDatabaseSuccess | WebDatabaseFailure;
