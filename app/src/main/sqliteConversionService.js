const fs = require('fs');
const os = require('os');
const path = require('path');
const { isDeepStrictEqual } = require('util');

const sqliteExchangeModel = require('./sqliteExchangeModel');
const sqliteSchemaService = require('./sqliteSchemaService');

const TABLE_ORDER = Object.freeze([
  'project_settings',
  'zones',
  'points',
  'phenology_entries',
  'images',
  'taxonomy_candidates'
]);

const TABLE_COLUMNS = Object.freeze({
  project_settings: Object.freeze([
    ['key', 'key'],
    ['value_json', 'valueJson']
  ]),
  zones: Object.freeze([
    ['internal_key', 'internalKey'],
    ['source_index', 'sourceIndex'],
    ['id', 'id'],
    ['zone_id', 'zoneId'],
    ['name', 'name'],
    ['title', 'title'],
    ['label', 'label'],
    ['display_name', 'displayName'],
    ['description', 'description'],
    ['geometry_json', 'geometryJson'],
    ['compat_json', 'compatJson'],
    ['present_fields_json', 'presentFieldsJson']
  ]),
  points: Object.freeze([
    ['internal_key', 'internalKey'],
    ['source_index', 'sourceIndex'],
    ['id', 'id'],
    ['point_id', 'pointId'],
    ['zone_ref', 'zoneRef'],
    ['zone_id', 'zoneId'],
    ['zone', 'zone'],
    ['lat', 'lat'],
    ['lng', 'lng'],
    ['plant_name_cn', 'plantNameCn'],
    ['plant_name_sci', 'plantNameSci'],
    ['family', 'family'],
    ['genus', 'genus'],
    ['identification_status', 'identificationStatus'],
    ['taxonomy_source', 'taxonomySource'],
    ['taxonomy_matched_name', 'taxonomyMatchedName'],
    ['taxonomy_confidence', 'taxonomyConfidence'],
    ['taxonomy_confidence_label', 'taxonomyConfidenceLabel'],
    ['taxonomy_verification_status', 'taxonomyVerificationStatus'],
    ['taxonomy_updated_at', 'taxonomyUpdatedAt'],
    ['observer', 'observer'],
    ['survey_date', 'surveyDate'],
    ['habitat', 'habitat'],
    ['abundance', 'abundance'],
    ['growth_form', 'growthForm'],
    ['flowering_state', 'floweringState'],
    ['cultivated_status', 'cultivatedStatus'],
    ['note', 'note'],
    ['images_json', 'imagesJson'],
    ['selected_phenology_id', 'selectedPhenologyId'],
    ['compat_json', 'compatJson'],
    ['present_fields_json', 'presentFieldsJson']
  ]),
  phenology_entries: Object.freeze([
    ['internal_key', 'internalKey'],
    ['point_internal_key', 'pointInternalKey'],
    ['source_index', 'sourceIndex'],
    ['id', 'id'],
    ['label', 'label'],
    ['observer', 'observer'],
    ['survey_date', 'surveyDate'],
    ['habitat', 'habitat'],
    ['abundance', 'abundance'],
    ['growth_form', 'growthForm'],
    ['flowering_state', 'floweringState'],
    ['cultivated_status', 'cultivatedStatus'],
    ['note', 'note'],
    ['images_json', 'imagesJson'],
    ['compat_json', 'compatJson'],
    ['present_fields_json', 'presentFieldsJson']
  ]),
  images: Object.freeze([
    ['owner_type', 'ownerType'],
    ['owner_internal_key', 'ownerInternalKey'],
    ['point_internal_key', 'pointInternalKey'],
    ['source_index', 'sourceIndex'],
    ['path', 'path']
  ]),
  taxonomy_candidates: Object.freeze([
    ['internal_key', 'internalKey'],
    ['point_internal_key', 'pointInternalKey'],
    ['source_index', 'sourceIndex'],
    ['provider', 'provider'],
    ['matched_name', 'matchedName'],
    ['scientific_name', 'scientificName'],
    ['canonical_name', 'canonicalName'],
    ['family', 'family'],
    ['genus', 'genus'],
    ['rank', 'rank'],
    ['score', 'score'],
    ['match_type', 'matchType'],
    ['occurrence_weight', 'occurrenceWeight'],
    ['selected', 'selected'],
    ['compat_json', 'compatJson'],
    ['present_fields_json', 'presentFieldsJson']
  ])
});

function getConversionTableNames() {
  return TABLE_ORDER.slice();
}

function removeQuietly(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (_error) {
    // Cleanup should not mask the conversion result.
  }
}

function tableSqlName(tableName) {
  if (!Object.prototype.hasOwnProperty.call(TABLE_COLUMNS, tableName)) {
    throw new Error(`unsupported table: ${tableName}`);
  }
  return tableName;
}

function insertRows(db, tableName, rows = []) {
  const safeTableName = tableSqlName(tableName);
  const columns = TABLE_COLUMNS[safeTableName];
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const dbColumns = columns.map(([dbColumn]) => dbColumn);
  const values = dbColumns.map(() => '?').join(', ');
  const statement = db.prepare(`INSERT INTO ${safeTableName} (${dbColumns.join(', ')}) VALUES (${values})`);
  const insertMany = db.transaction(items => {
    items.forEach(row => {
      statement.run(columns.map(([, modelKey]) => {
        if (modelKey === 'selected') {
          return row[modelKey] ? 1 : 0;
        }
        return row[modelKey] === undefined ? '' : row[modelKey];
      }));
    });
  });

  insertMany(rows);
  return rows.length;
}

function writeModelToDatabase(db, model) {
  const validation = sqliteExchangeModel.validateSqliteExchangeModel(model);
  if (!validation.ok) {
    throw new Error(validation.errors.join('; '));
  }

  db.exec(sqliteSchemaService.createSchemaSql());
  const tables = model.tables || {};
  const written = {};
  TABLE_ORDER.forEach(tableName => {
    written[tableName] = insertRows(db, tableName, tables[tableName] || []);
  });
  return written;
}

function rowFromDatabase(tableName, row) {
  const out = {};
  TABLE_COLUMNS[tableName].forEach(([dbColumn, modelKey]) => {
    if (modelKey === 'selected') {
      out[modelKey] = Boolean(row[dbColumn]);
      return;
    }
    out[modelKey] = row[dbColumn];
  });
  return out;
}

function readRows(db, tableName) {
  tableSqlName(tableName);
  const orderBy = tableName === 'project_settings'
    ? 'key'
    : tableName === 'images'
      ? 'owner_type, owner_internal_key, source_index, path'
      : 'source_index, internal_key';
  return db
    .prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`)
    .all()
    .map(row => rowFromDatabase(tableName, row));
}

function readModelFromDatabase(db, options = {}) {
  const tables = {};
  TABLE_ORDER.forEach(tableName => {
    tables[tableName] = readRows(db, tableName);
  });
  return {
    version: sqliteExchangeModel.MODEL_VERSION,
    generatedAt: options.generatedAt || new Date().toISOString(),
    tables,
    report: {
      zoneCount: tables.zones.length,
      pointCount: tables.points.length,
      phenologyEntryCount: tables.phenology_entries.length,
      imageReferenceCount: tables.images.length,
      taxonomyCandidateCount: tables.taxonomy_candidates.length,
      warnings: []
    }
  };
}

function countRows(tables = {}) {
  const counts = {};
  TABLE_ORDER.forEach(tableName => {
    counts[tableName] = Array.isArray(tables[tableName]) ? tables[tableName].length : 0;
  });
  return counts;
}

function runTemporaryJsonSqliteRoundTrip(project, options = {}) {
  const Database = options.Database || require('better-sqlite3');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-sqlite-conversion-'));
  const dbPath = path.join(root, 'conversion.sqlite');
  const originalProject = JSON.parse(JSON.stringify(project));
  let db = null;
  let closed = false;
  let result = null;

  try {
    const sourceModel = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    const writtenRows = writeModelToDatabase(db, sourceModel);
    const schemaValidation = sqliteSchemaService.validateSchemaTables(db);
    const restoredModel = readModelFromDatabase(db, {
      generatedAt: sourceModel.generatedAt
    });
    const modelValidation = sqliteExchangeModel.validateSqliteExchangeModel(restoredModel);
    const restoredProject = sqliteExchangeModel.buildJsonProjectFromSqliteModel(restoredModel);
    const jsonEqual = isDeepStrictEqual(restoredProject, originalProject);
    const inputUnchanged = isDeepStrictEqual(project, originalProject);
    const report = sqliteExchangeModel.buildConversionReport(restoredModel, {
      direction: 'json-sqlite-json-temporary-round-trip',
      generatedAt: sourceModel.generatedAt
    });

    db.close();
    closed = true;
    db = null;

    result = {
      ok: schemaValidation.ok && modelValidation.ok && jsonEqual && inputUnchanged,
      runtime: process.versions.electron ? 'electron-main' : 'node',
      temporaryDatabaseCreated: true,
      writesProjectData: false,
      schema: {
        ok: schemaValidation.ok,
        missingTables: schemaValidation.missingTables,
        missingColumns: schemaValidation.missingColumns
      },
      model: {
        ok: modelValidation.ok,
        errors: modelValidation.errors
      },
      roundTrip: {
        jsonEqual,
        inputUnchanged,
        sourceRows: countRows(sourceModel.tables),
        restoredRows: countRows(restoredModel.tables),
        writtenRows
      },
      report: {
        status: report.status,
        counts: report.counts,
        compatibility: report.compatibility,
        safety: report.safety,
        privacy: report.privacy
      },
      warnings: []
    };
  } catch (error) {
    result = {
      ok: false,
      runtime: process.versions.electron ? 'electron-main' : 'node',
      temporaryDatabaseCreated: true,
      writesProjectData: false,
      error: error.message,
      warnings: []
    };
  } finally {
    if (db) {
      try {
        db.close();
        closed = true;
      } catch (_error) {
        closed = false;
      }
    }
    removeQuietly(root);
  }

  return {
    ...result,
    closed,
    cleaned: !fs.existsSync(root)
  };
}

module.exports = {
  getConversionTableNames,
  writeModelToDatabase,
  readModelFromDatabase,
  runTemporaryJsonSqliteRoundTrip
};
