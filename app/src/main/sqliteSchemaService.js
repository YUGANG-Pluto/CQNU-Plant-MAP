const fs = require('fs');
const os = require('os');
const path = require('path');

const SCHEMA_VERSION = 'sqlite-schema-v1';

/**
 * @typedef {{
 *   ok: boolean,
 *   schemaVersion: string,
 *   expectedTables: string[],
 *   tablesCreated: string[],
 *   missingTables: string[],
 *   missingColumns?: object,
 *   error?: string,
 *   runtime?: string,
 *   package?: string,
 *   temporaryDatabaseCreated?: boolean,
 *   writesProjectData?: boolean,
 *   closed?: boolean,
 *   cleaned?: boolean,
 *   warnings?: string[]
 * }} SqliteSchemaValidation
 */

const EXPECTED_TABLES = Object.freeze([
  'project_settings',
  'zones',
  'points',
  'phenology_entries',
  'images',
  'point_images',
  'taxonomy_candidates',
  'export_runs'
]);

const SCHEMA_STATEMENTS = Object.freeze([
  `CREATE TABLE IF NOT EXISTS project_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS zones (
    internal_key TEXT PRIMARY KEY,
    source_index INTEGER NOT NULL DEFAULT 0,
    id TEXT NOT NULL DEFAULT '',
    zone_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    geometry_json TEXT NOT NULL DEFAULT 'null',
    compat_json TEXT NOT NULL DEFAULT '{}',
    present_fields_json TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS points (
    internal_key TEXT PRIMARY KEY,
    source_index INTEGER NOT NULL DEFAULT 0,
    id TEXT NOT NULL DEFAULT '',
    point_id TEXT NOT NULL DEFAULT '',
    zone_ref TEXT NOT NULL DEFAULT '',
    zone_id TEXT NOT NULL DEFAULT '',
    zone TEXT NOT NULL DEFAULT '',
    lat REAL,
    lng REAL,
    plant_name_cn TEXT NOT NULL DEFAULT '',
    plant_name_sci TEXT NOT NULL DEFAULT '',
    family TEXT NOT NULL DEFAULT '',
    genus TEXT NOT NULL DEFAULT '',
    identification_status TEXT NOT NULL DEFAULT '',
    taxonomy_source TEXT NOT NULL DEFAULT '',
    taxonomy_matched_name TEXT NOT NULL DEFAULT '',
    taxonomy_confidence REAL,
    taxonomy_confidence_label TEXT NOT NULL DEFAULT '',
    taxonomy_verification_status TEXT NOT NULL DEFAULT '',
    taxonomy_updated_at TEXT NOT NULL DEFAULT '',
    observer TEXT NOT NULL DEFAULT '',
    survey_date TEXT NOT NULL DEFAULT '',
    habitat TEXT NOT NULL DEFAULT '',
    abundance TEXT NOT NULL DEFAULT '',
    growth_form TEXT NOT NULL DEFAULT '',
    flowering_state TEXT NOT NULL DEFAULT '',
    cultivated_status TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    images_json TEXT NOT NULL DEFAULT 'null',
    selected_phenology_id TEXT NOT NULL DEFAULT '',
    compat_json TEXT NOT NULL DEFAULT '{}',
    present_fields_json TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS phenology_entries (
    internal_key TEXT PRIMARY KEY,
    point_internal_key TEXT NOT NULL,
    source_index INTEGER NOT NULL DEFAULT 0,
    id TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT '',
    observer TEXT NOT NULL DEFAULT '',
    survey_date TEXT NOT NULL DEFAULT '',
    habitat TEXT NOT NULL DEFAULT '',
    abundance TEXT NOT NULL DEFAULT '',
    growth_form TEXT NOT NULL DEFAULT '',
    flowering_state TEXT NOT NULL DEFAULT '',
    cultivated_status TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    images_json TEXT NOT NULL DEFAULT 'null',
    compat_json TEXT NOT NULL DEFAULT '{}',
    present_fields_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (point_internal_key) REFERENCES points(internal_key) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_type TEXT NOT NULL,
    owner_internal_key TEXT NOT NULL,
    point_internal_key TEXT NOT NULL DEFAULT '',
    source_index INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS point_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    point_internal_key TEXT NOT NULL,
    image_path TEXT NOT NULL,
    source_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (point_internal_key) REFERENCES points(internal_key) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS taxonomy_candidates (
    internal_key TEXT PRIMARY KEY,
    point_internal_key TEXT NOT NULL,
    source_index INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL DEFAULT '',
    matched_name TEXT NOT NULL DEFAULT '',
    scientific_name TEXT NOT NULL DEFAULT '',
    canonical_name TEXT NOT NULL DEFAULT '',
    family TEXT NOT NULL DEFAULT '',
    genus TEXT NOT NULL DEFAULT '',
    rank TEXT NOT NULL DEFAULT '',
    score REAL,
    match_type TEXT NOT NULL DEFAULT '',
    occurrence_weight REAL,
    selected INTEGER NOT NULL DEFAULT 0,
    compat_json TEXT NOT NULL DEFAULT '{}',
    present_fields_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (point_internal_key) REFERENCES points(internal_key) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS export_runs (
    id TEXT PRIMARY KEY,
    export_type TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    summary_json TEXT NOT NULL DEFAULT '{}'
  )`,
  'CREATE INDEX IF NOT EXISTS idx_points_zone_id ON points(zone_id)',
  'CREATE INDEX IF NOT EXISTS idx_points_family_genus ON points(family, genus)',
  'CREATE INDEX IF NOT EXISTS idx_phenology_point ON phenology_entries(point_internal_key)',
  'CREATE INDEX IF NOT EXISTS idx_images_owner ON images(owner_type, owner_internal_key)',
  'CREATE INDEX IF NOT EXISTS idx_taxonomy_candidates_point ON taxonomy_candidates(point_internal_key)'
]);

const REQUIRED_COLUMNS = Object.freeze({
  project_settings: ['key', 'value_json'],
  zones: ['internal_key', 'source_index', 'name', 'geometry_json', 'compat_json', 'present_fields_json'],
  points: [
    'internal_key',
    'source_index',
    'point_id',
    'zone_id',
    'lat',
    'lng',
    'plant_name_cn',
    'plant_name_sci',
    'family',
    'genus',
    'taxonomy_source',
    'taxonomy_verification_status',
    'compat_json',
    'present_fields_json'
  ],
  phenology_entries: ['internal_key', 'point_internal_key', 'source_index', 'flowering_state', 'compat_json'],
  images: ['id', 'owner_type', 'owner_internal_key', 'point_internal_key', 'source_index', 'path'],
  point_images: ['id', 'point_internal_key', 'image_path', 'source_index'],
  taxonomy_candidates: [
    'internal_key',
    'point_internal_key',
    'provider',
    'matched_name',
    'scientific_name',
    'family',
    'genus',
    'occurrence_weight',
    'compat_json'
  ],
  export_runs: ['id', 'export_type', 'generated_at', 'summary_json']
});

function getExpectedTables() {
  return EXPECTED_TABLES.slice();
}

function getSchemaStatements() {
  return SCHEMA_STATEMENTS.slice();
}

function createSchemaSql() {
  return `${SCHEMA_STATEMENTS.join(';\n')};`;
}

function listMissingTables(tableNames) {
  const actual = new Set((tableNames || []).filter(Boolean));
  return EXPECTED_TABLES.filter(tableName => !actual.has(tableName));
}

/**
 * @param {string[]} tableNames
 * @returns {SqliteSchemaValidation}
 */
function validateSchemaTableNames(tableNames) {
  const missingTables = listMissingTables(tableNames);
  return {
    ok: missingTables.length === 0,
    schemaVersion: SCHEMA_VERSION,
    expectedTables: getExpectedTables(),
    tablesCreated: EXPECTED_TABLES.filter(tableName => !missingTables.includes(tableName)),
    missingTables
  };
}

function readTableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map(row => row.name);
}

function validateRequiredColumns(db) {
  const missingColumns = {};
  Object.entries(REQUIRED_COLUMNS).forEach(([tableName, requiredColumns]) => {
    const columnRows = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const actual = new Set(columnRows.map(row => row.name));
    const missing = requiredColumns.filter(columnName => !actual.has(columnName));
    if (missing.length > 0) {
      missingColumns[tableName] = missing;
    }
  });
  return missingColumns;
}

/**
 * @param {{ prepare: (sql: string) => { all: () => Array<Record<string, unknown>> } }} db
 * @returns {SqliteSchemaValidation}
 */
function validateSchemaTables(db) {
  const tableValidation = validateSchemaTableNames(readTableNames(db));
  const missingColumns = tableValidation.ok ? validateRequiredColumns(db) : {};
  return {
    ...tableValidation,
    missingColumns,
    ok: tableValidation.ok && Object.keys(missingColumns).length === 0
  };
}

function removeQuietly(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch {
    // Cleanup must not hide the schema check result.
  }
}

/**
 * @param {{ Database?: new (filePath: string) => { pragma: (sql: string) => void, exec: (sql: string) => void, close: () => void, prepare: (sql: string) => { all: () => Array<Record<string, unknown>> } } }} [options]
 * @returns {SqliteSchemaValidation}
 */
function checkSchemaInTemporaryDatabase(options = {}) {
  const Database = options.Database || require('better-sqlite3');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-sqlite-schema-'));
  const dbPath = path.join(root, 'schema.sqlite');
  let db = null;
  let closed = false;
  let validation = null;

  try {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.exec(createSchemaSql());
    validation = validateSchemaTables(db);
    db.close();
    closed = true;
    db = null;
  } catch (error) {
    validation = {
      ok: false,
      schemaVersion: SCHEMA_VERSION,
      expectedTables: getExpectedTables(),
      tablesCreated: [],
      missingTables: getExpectedTables(),
      missingColumns: {},
      error: error.message
    };
  } finally {
    if (db) {
      try {
        db.close();
        closed = true;
      } catch {
        closed = false;
      }
    }
    removeQuietly(root);
  }

  return {
    ...validation,
    runtime: process.versions.electron ? 'electron-main' : 'node',
    package: 'better-sqlite3',
    temporaryDatabaseCreated: true,
    writesProjectData: false,
    closed,
    cleaned: !fs.existsSync(root),
    warnings: []
  };
}

module.exports = {
  SCHEMA_VERSION,
  getExpectedTables,
  getSchemaStatements,
  createSchemaSql,
  validateSchemaTableNames,
  validateSchemaTables,
  checkSchemaInTemporaryDatabase
};
