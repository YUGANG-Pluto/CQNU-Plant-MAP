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
