import type {
  ExternalSqliteReadResult,
  StoredWebProject,
  WebProjectRecord
} from './webDatabaseProtocol';

export interface ExternalSqliteDatabase {
  exec(input: string | {
    sql: string;
    bind?: unknown[];
    rowMode?: 'object';
    returnValue?: 'resultRows';
  }): unknown;
  close(): void;
}

export interface ExternalSqlitePool {
  OpfsSAHPoolDb: new (filename: string) => ExternalSqliteDatabase;
  getCapacity(): number;
  getFileCount(): number;
  importDb(filename: string, data: Uint8Array | ArrayBuffer): Promise<number>;
  reserveMinimumCapacity(minimum: number): Promise<number>;
  unlink(filename: string): boolean;
}

const MAX_EXTERNAL_SQLITE_BYTES = 256 * 1024 * 1024;
const EXTERNAL_TEMP_PREFIX = '/cqnu-external-read-';
const DESKTOP_TABLE_QUERIES = Object.freeze({
  project_settings: `SELECT key, value_json AS valueJson FROM project_settings ORDER BY key`,
  zones: `SELECT
    internal_key AS internalKey, source_index AS sourceIndex, id, zone_id AS zoneId,
    name, title, label, display_name AS displayName, description,
    geometry_json AS geometryJson, compat_json AS compatJson,
    present_fields_json AS presentFieldsJson
    FROM zones ORDER BY source_index, internal_key`,
  points: `SELECT
    internal_key AS internalKey, source_index AS sourceIndex, id, point_id AS pointId,
    zone_ref AS zoneRef, zone_id AS zoneId, zone, lat, lng,
    plant_name_cn AS plantNameCn, plant_name_sci AS plantNameSci, family, genus,
    identification_status AS identificationStatus, taxonomy_source AS taxonomySource,
    taxonomy_matched_name AS taxonomyMatchedName, taxonomy_confidence AS taxonomyConfidence,
    taxonomy_confidence_label AS taxonomyConfidenceLabel,
    taxonomy_verification_status AS taxonomyVerificationStatus,
    taxonomy_updated_at AS taxonomyUpdatedAt, observer, survey_date AS surveyDate,
    habitat, abundance, growth_form AS growthForm, flowering_state AS floweringState,
    cultivated_status AS cultivatedStatus, note, images_json AS imagesJson,
    selected_phenology_id AS selectedPhenologyId, compat_json AS compatJson,
    present_fields_json AS presentFieldsJson
    FROM points ORDER BY source_index, internal_key`,
  phenology_entries: `SELECT
    internal_key AS internalKey, point_internal_key AS pointInternalKey,
    source_index AS sourceIndex, id, label, observer, survey_date AS surveyDate,
    habitat, abundance, growth_form AS growthForm, flowering_state AS floweringState,
    cultivated_status AS cultivatedStatus, note, images_json AS imagesJson,
    compat_json AS compatJson, present_fields_json AS presentFieldsJson
    FROM phenology_entries ORDER BY point_internal_key, source_index, internal_key`,
  taxonomy_candidates: `SELECT
    internal_key AS internalKey, point_internal_key AS pointInternalKey,
    source_index AS sourceIndex, provider, matched_name AS matchedName,
    scientific_name AS scientificName, canonical_name AS canonicalName,
    family, genus, rank, score, match_type AS matchType,
    occurrence_weight AS occurrenceWeight, selected,
    compat_json AS compatJson, present_fields_json AS presentFieldsJson
    FROM taxonomy_candidates ORDER BY point_internal_key, source_index, internal_key`
});

function record(value: unknown): WebProjectRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as WebProjectRecord
    : {};
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sourceKind(value: unknown): StoredWebProject['sourceKind'] {
  return ['directory', 'import', 'sqlite'].includes(text(value))
    ? text(value) as StoredWebProject['sourceKind']
    : 'opfs';
}

function parseJson(value: unknown, fallback: unknown): unknown {
  try {
    return JSON.parse(text(value)) as unknown;
  } catch {
    return fallback;
  }
}

function rows(db: ExternalSqliteDatabase, sql: string, bind: unknown[] = []): WebProjectRecord[] {
  const result = db.exec({ sql, bind, rowMode: 'object', returnValue: 'resultRows' });
  return Array.isArray(result)
    ? result.filter(item => item && typeof item === 'object') as WebProjectRecord[]
    : [];
}

function storedProject(row: WebProjectRecord): StoredWebProject {
  const project = record(parseJson(row.project_json, {}));
  return {
    projectId: text(row.project_id),
    label: text(row.label),
    modifiedAt: number(row.modified_at),
    sourceKind: sourceKind(row.source_kind),
    settings: record(project.settings),
    zones: Array.isArray(project.zones) ? project.zones.filter(item => item && typeof item === 'object') as WebProjectRecord[] : [],
    points: Array.isArray(project.points) ? project.points.filter(item => item && typeof item === 'object') as WebProjectRecord[] : []
  };
}

function tableNames(db: ExternalSqliteDatabase): Set<string> {
  return new Set(rows(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).map(row => text(row.name)).filter(Boolean));
}

function quickCheck(db: ExternalSqliteDatabase): 'ok' {
  const row = rows(db, 'PRAGMA quick_check')[0] || {};
  const value = text(row.quick_check || Object.values(row)[0]);
  if (value.toLocaleLowerCase() !== 'ok') {
    throw new Error(`SQLite 完整性检查未通过：${value || 'unknown result'}`);
  }
  return 'ok';
}

function assertColumns(db: ExternalSqliteDatabase, tableName: string, required: readonly string[]): void {
  const columns = new Set(rows(db, `PRAGMA table_info(${tableName})`).map(row => text(row.name)));
  const missing = required.filter(column => !columns.has(column));
  if (missing.length) throw new Error(`SQLite 表 ${tableName} 缺少必要列：${missing.join(', ')}`);
}

function webProject(db: ExternalSqliteDatabase): ExternalSqliteReadResult {
  assertColumns(db, 'web_projects', ['project_id', 'label', 'modified_at', 'source_kind', 'project_json']);
  const projectCount = number(rows(db, 'SELECT count(*) AS count FROM web_projects')[0]?.count);
  if (projectCount < 1) throw new Error('浏览器 SQLite 数据库中没有项目记录。');
  const row = rows(db, `SELECT project_id, label, modified_at, source_kind, project_json
    FROM web_projects ORDER BY modified_at DESC, project_id LIMIT 1`)[0];
  if (!row) throw new Error('浏览器 SQLite 数据库中没有可读取的项目。');
  return {
    format: 'web-projects',
    bytesRead: 0,
    quickCheck: 'ok',
    projectCount,
    project: storedProject(row),
    warnings: projectCount > 1 ? [`数据库包含 ${projectCount} 个项目，已导入最近修改的项目。`] : []
  };
}

function desktopProject(db: ExternalSqliteDatabase, names: Set<string>): ExternalSqliteReadResult {
  const missingTables = ['project_settings', 'zones', 'points'].filter(name => !names.has(name));
  if (missingTables.length) throw new Error(`SQLite 数据库缺少项目核心表：${missingTables.join(', ')}`);
  assertColumns(db, 'project_settings', ['key', 'value_json']);
  assertColumns(db, 'zones', ['internal_key', 'source_index', 'geometry_json', 'compat_json', 'present_fields_json']);
  assertColumns(db, 'points', ['internal_key', 'source_index', 'point_id', 'zone_id', 'lat', 'lng', 'compat_json', 'present_fields_json']);
  const tables: Record<string, WebProjectRecord[]> = {};
  Object.entries(DESKTOP_TABLE_QUERIES).forEach(([tableName, sql]) => {
    tables[tableName] = names.has(tableName) ? rows(db, sql) : [];
  });
  return {
    format: 'desktop-project',
    bytesRead: 0,
    quickCheck: 'ok',
    projectCount: 1,
    tables,
    warnings: []
  };
}

export async function readExternalSqliteDatabase(
  pool: ExternalSqlitePool,
  payload: unknown
): Promise<ExternalSqliteReadResult> {
  const rawBytes = record(payload).bytes;
  const bytes = rawBytes instanceof ArrayBuffer ? rawBytes : rawBytes instanceof Uint8Array ? rawBytes : null;
  if (!bytes || bytes.byteLength < 100) throw new Error('所选文件不是有效的 SQLite 数据库。');
  if (bytes.byteLength > MAX_EXTERNAL_SQLITE_BYTES) {
    throw new Error('所选 SQLite 数据库超过 256 MiB 的浏览器导入上限。');
  }
  const filename = `${EXTERNAL_TEMP_PREFIX}${crypto.randomUUID()}.sqlite3`;
  let database: ExternalSqliteDatabase | null = null;
  try {
    await pool.reserveMinimumCapacity(Math.max(pool.getCapacity(), pool.getFileCount() + 2));
    const bytesRead = await pool.importDb(filename, bytes);
    database = new pool.OpfsSAHPoolDb(filename);
    database.exec('PRAGMA query_only = ON');
    const checked = quickCheck(database);
    const names = tableNames(database);
    const result = names.has('web_projects') ? webProject(database) : desktopProject(database, names);
    return { ...result, bytesRead, quickCheck: checked };
  } finally {
    database?.close();
    pool.unlink(filename);
  }
}
