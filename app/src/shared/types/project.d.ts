import type { ProjectSettings } from './settings';
import type { ZoneRecord } from './zone';
import type { PointRecord } from './point';

export interface JsonProjectSnapshot {
  projectDir?: string;
  infoDir?: string;
  imagesDir?: string;
  settings: ProjectSettings;
  zones: ZoneRecord[];
  points: PointRecord[];
  projectModifiedTime?: number;
}

export type StorageFormat = 'auto' | 'json' | 'sqlite';
export type ActiveStorageFormat = 'json' | 'sqlite';

export interface ProjectLoadPayload {
  projectDir: string;
  storageFormat?: StorageFormat;
}

export interface ProjectSavePayload {
  projectDir: string;
  settings: ProjectSettings;
  zones: ZoneRecord[];
  points: PointRecord[];
  storageFormat?: StorageFormat;
}

export interface LoadedProjectSnapshot extends JsonProjectSnapshot {
  projectDir: string;
  infoDir: string;
  imagesDir: string;
  storageFormat: ActiveStorageFormat;
  jsonFilesExist: boolean;
  sqliteDatabaseExists: boolean;
  projectModifiedTime: number;
}

export interface ProjectSaveResult {
  projectDir: string;
  storageFormat: ActiveStorageFormat;
  jsonFilesExist: boolean;
  sqliteDatabaseExists: boolean;
  projectModifiedTime: number;
}
