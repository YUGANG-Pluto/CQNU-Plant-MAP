import type { UnknownRecord } from '../../domain/project/types';

export type RendererLanguage = 'zh' | 'en';
export type RendererStorageFormat = 'json' | 'sqlite';

export interface LegacyRendererState {
  projectDir?: unknown;
  projectModifiedTime?: unknown;
  storageFormat?: unknown;
  settings?: unknown;
  zones?: unknown;
  points?: unknown;
  selectedZoneId?: unknown;
  selectedPointId?: unknown;
  selectedPhenologyId?: unknown;
  hoveredZoneId?: unknown;
  hoveredPointId?: unknown;
  activeListTab?: unknown;
  currentMode?: unknown;
}

export interface RendererStateSnapshot {
  hasProject: boolean;
  revision: number;
  storageFormat: RendererStorageFormat;
  language: RendererLanguage;
  zoneCount: number;
  pointCount: number;
  selectedZoneId: string;
  selectedPointId: string;
  selectedPhenologyId: string;
  currentMode: string;
  readOnly: boolean;
}

export interface RendererProjectData {
  zones: readonly UnknownRecord[];
  points: readonly UnknownRecord[];
}

export interface RendererStateFacade {
  snapshot(): Readonly<RendererStateSnapshot>;
  projectData(): Readonly<RendererProjectData>;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanRevision(value: unknown): number {
  const revision = Number(value);
  return Number.isFinite(revision) && revision >= 0 ? revision : 0;
}

function cloneRecords(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  if (typeof structuredClone === 'function') {
    return structuredClone(value).map(asRecord);
  }
  return JSON.parse(JSON.stringify(value)).map(asRecord);
}

function safeModeEnabled(settingsValue: unknown): boolean {
  const settings = asRecord(settingsValue);
  const safeMode = asRecord(settings.maintenanceSafeMode);
  return safeMode.enabled === true;
}

export function createRendererStateFacade(readState: () => LegacyRendererState | undefined): RendererStateFacade {
  return Object.freeze({
    snapshot(): Readonly<RendererStateSnapshot> {
      const source = readState() || {};
      const settings = asRecord(source.settings);
      const storageFormat = source.storageFormat === 'sqlite' ? 'sqlite' : 'json';
      const language = settings.language === 'en' ? 'en' : 'zh';
      return Object.freeze({
        hasProject: Boolean(cleanText(source.projectDir)),
        revision: cleanRevision(source.projectModifiedTime),
        storageFormat,
        language,
        zoneCount: Array.isArray(source.zones) ? source.zones.length : 0,
        pointCount: Array.isArray(source.points) ? source.points.length : 0,
        selectedZoneId: cleanText(source.selectedZoneId),
        selectedPointId: cleanText(source.selectedPointId),
        selectedPhenologyId: cleanText(source.selectedPhenologyId),
        currentMode: cleanText(source.currentMode) || 'browse',
        readOnly: safeModeEnabled(source.settings)
      });
    },
    projectData(): Readonly<RendererProjectData> {
      const source = readState() || {};
      return Object.freeze({
        zones: Object.freeze(cloneRecords(source.zones)),
        points: Object.freeze(cloneRecords(source.points))
      });
    }
  });
}
