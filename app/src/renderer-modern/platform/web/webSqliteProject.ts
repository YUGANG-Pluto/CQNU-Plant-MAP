import type {
  ExternalSqliteReadResult,
  WebProjectRecord,
  WebProjectSourceKind
} from './webDatabaseProtocol';

export const MAX_EXTERNAL_SQLITE_BYTES = 256 * 1024 * 1024;
export const SQLITE_FILE_PATTERN = /\.(?:db|sqlite|sqlite3)$/i;
const SQLITE_HEADER = 'SQLite format 3\0';

type ProjectDocument = {
  settings: WebProjectRecord;
  zones: WebProjectRecord[];
  points: WebProjectRecord[];
};

function record(value: unknown): WebProjectRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as WebProjectRecord
    : {};
}

function records(value: unknown): WebProjectRecord[] {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as WebProjectRecord[]
    : [];
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson(value: unknown, fallback: unknown): unknown {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(String(value)) as unknown;
  } catch {
    return fallback;
  }
}

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function restoreRecord(row: WebProjectRecord, fieldValues: WebProjectRecord): WebProjectRecord {
  const compatible = record(parseJson(row.compatJson, {}));
  const fields = parseJson(row.presentFieldsJson, []);
  if (!Array.isArray(fields)) return compatible;
  fields.forEach(field => {
    const name = text(field);
    if (name && Object.prototype.hasOwnProperty.call(fieldValues, name)) {
      compatible[name] = clone(fieldValues[name]);
    }
  });
  return compatible;
}

function restoreZone(row: WebProjectRecord): WebProjectRecord {
  return restoreRecord(row, {
    id: row.id,
    zoneId: row.zoneId,
    name: row.name,
    title: row.title,
    label: row.label,
    displayName: row.displayName,
    description: row.description,
    geometry: parseJson(row.geometryJson, null)
  });
}

function restorePhenology(row: WebProjectRecord): WebProjectRecord {
  return restoreRecord(row, {
    id: row.id,
    label: row.label,
    observer: row.observer,
    surveyDate: row.surveyDate,
    habitat: row.habitat,
    abundance: row.abundance,
    growthForm: row.growthForm,
    floweringState: row.floweringState,
    cultivatedStatus: row.cultivatedStatus,
    note: row.note,
    images: parseJson(row.imagesJson, undefined)
  });
}

function restoreTaxonomyCandidate(row: WebProjectRecord): WebProjectRecord {
  return restoreRecord(row, {
    provider: row.provider,
    matchedName: row.matchedName,
    scientificName: row.scientificName,
    canonicalName: row.canonicalName,
    family: row.family,
    genus: row.genus,
    rank: row.rank,
    score: row.score,
    matchType: row.matchType,
    occurrenceWeight: row.occurrenceWeight,
    selected: Boolean(row.selected)
  });
}

function childRows(
  rows: WebProjectRecord[],
  pointInternalKey: unknown,
  restore: (row: WebProjectRecord) => WebProjectRecord
): WebProjectRecord[] {
  return rows
    .filter(item => item.pointInternalKey === pointInternalKey)
    .slice()
    .sort((left, right) => number(left.sourceIndex) - number(right.sourceIndex))
    .map(restore);
}

function restorePoint(
  row: WebProjectRecord,
  phenologyRows: WebProjectRecord[],
  candidateRows: WebProjectRecord[]
): WebProjectRecord {
  const point = restoreRecord(row, {
    id: row.id,
    pointId: row.pointId,
    zoneRef: row.zoneRef,
    zoneId: row.zoneId,
    zone: row.zone,
    lat: row.lat,
    lng: row.lng,
    plantNameCn: row.plantNameCn,
    plantNameSci: row.plantNameSci,
    family: row.family,
    genus: row.genus,
    identificationStatus: row.identificationStatus,
    taxonomySource: row.taxonomySource,
    taxonomyMatchedName: row.taxonomyMatchedName,
    taxonomyConfidence: row.taxonomyConfidence,
    taxonomyConfidenceLabel: row.taxonomyConfidenceLabel,
    taxonomyVerificationStatus: row.taxonomyVerificationStatus,
    taxonomyUpdatedAt: row.taxonomyUpdatedAt,
    observer: row.observer,
    surveyDate: row.surveyDate,
    habitat: row.habitat,
    abundance: row.abundance,
    growthForm: row.growthForm,
    floweringState: row.floweringState,
    cultivatedStatus: row.cultivatedStatus,
    note: row.note,
    images: parseJson(row.imagesJson, undefined),
    selectedPhenologyId: row.selectedPhenologyId
  });
  const fields = parseJson(row.presentFieldsJson, []);
  if (!Array.isArray(fields)) return point;
  if (fields.includes('phenologyEntries')) {
    point.phenologyEntries = childRows(phenologyRows, row.internalKey, restorePhenology);
  }
  if (fields.includes('taxonomyCandidatesSummary')) {
    point.taxonomyCandidatesSummary = childRows(candidateRows, row.internalKey, restoreTaxonomyCandidate);
  }
  return point;
}

export function hasSqliteHeader(bytes: ArrayBuffer | Uint8Array): boolean {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < SQLITE_HEADER.length) return false;
  return [...SQLITE_HEADER].every((character, index) => view[index] === character.charCodeAt(0));
}

export function assertExternalSqliteFile(file: Pick<File, 'name' | 'size'>, header: ArrayBuffer | Uint8Array): void {
  if (!SQLITE_FILE_PATTERN.test(file.name)) {
    throw new Error('请选择 .db、.sqlite 或 .sqlite3 格式的 SQLite 数据库。');
  }
  if (!file.size) throw new Error('所选 SQLite 数据库为空。');
  if (file.size > MAX_EXTERNAL_SQLITE_BYTES) {
    throw new Error('所选 SQLite 数据库超过 256 MiB 的浏览器导入上限。');
  }
  if (!hasSqliteHeader(header)) throw new Error('所选文件不是有效的 SQLite 3 数据库。');
}

export function deserializeDesktopSqliteTables(
  tables: Record<string, WebProjectRecord[]> = {}
): ProjectDocument {
  const settings: WebProjectRecord = {};
  records(tables.project_settings).forEach(row => {
    const key = text(row.key);
    if (key) settings[key] = parseJson(row.valueJson, null);
  });
  const phenologyRows = records(tables.phenology_entries);
  const candidateRows = records(tables.taxonomy_candidates);
  return {
    settings,
    zones: records(tables.zones)
      .slice()
      .sort((left, right) => number(left.sourceIndex) - number(right.sourceIndex))
      .map(restoreZone),
    points: records(tables.points)
      .slice()
      .sort((left, right) => number(left.sourceIndex) - number(right.sourceIndex))
      .map(row => restorePoint(row, phenologyRows, candidateRows))
  };
}

export function projectDocumentFromExternalSqlite(result: ExternalSqliteReadResult): ProjectDocument {
  if (result.format === 'desktop-project') {
    return deserializeDesktopSqliteTables(result.tables || {});
  }
  if (!result.project) throw new Error('浏览器 SQLite 数据库中没有可读取的项目。');
  return {
    settings: clone(record(result.project.settings)),
    zones: clone(records(result.project.zones)),
    points: clone(records(result.project.points))
  };
}

export function normalizeWebProjectSourceKind(value: unknown): WebProjectSourceKind {
  return ['directory', 'import', 'sqlite'].includes(text(value))
    ? text(value) as WebProjectSourceKind
    : 'opfs';
}
