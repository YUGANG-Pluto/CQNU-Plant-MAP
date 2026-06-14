const fs = require('fs');
const path = require('path');

const backupService = require('./backupService');
const logger = require('./logger');
const projectStore = require('./projectStore');
const sqliteConversionService = require('./sqliteConversionService');
const sqliteExchangeModel = require('./sqliteExchangeModel');
const sqliteSchemaService = require('./sqliteSchemaService');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const { writeTextFileAtomic } = require('./fileWrite');
const {
  assertInsidePath,
  assertTrustedProjectDir,
  ensureDirectory,
  getProjectInfoDir
} = require('./pathGuard');

/**
 * @typedef {import('../shared/types/settings').ProjectSettings} ProjectSettings
 * @typedef {import('../shared/types/ipc').StorageConversionPayload} StorageConversionPayload
 * @typedef {import('../shared/types/ipc').StorageArtifactDeletePayload} StorageArtifactDeletePayload
 * @typedef {import('../shared/types/ipc').StorageArtifactInventory} StorageArtifactInventory
 * @typedef {import('../shared/types/ipc').StorageConversionPreflight} StorageConversionPreflight
 * @typedef {import('../shared/types/ipc').StorageConversionReport} StorageConversionReport
 */

const SQLITE_DB_FILE = 'data.db';
const SQLITE_REPORT_FILE = 'sqlite-conversion-report.json';
const CONVERSION_SERVICE_VERSION = 'storage-conversion-v1';
const JSON_TO_SQLITE_BACKUP_LABEL = 'json_turn_sqlite';
const SQLITE_TO_JSON_BACKUP_LABEL = 'sqlite_turn_json';

function ensurePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'storage conversion payload is invalid');
  }
  return payload;
}

function getStoragePaths(projectDir) {
  const projectRoot = assertTrustedProjectDir(projectDir);
  const infoDir = getProjectInfoDir(projectRoot);
  ensureDirectory(infoDir);
  const databasePath = assertInsidePath(path.join(infoDir, SQLITE_DB_FILE), projectRoot, 'SQLite database');
  const reportPath = assertInsidePath(path.join(infoDir, SQLITE_REPORT_FILE), projectRoot, 'conversion report');
  return {
    projectRoot,
    infoDir,
    databasePath,
    reportPath
  };
}

function getJsonProjectFiles(paths) {
  return ['settings.json', 'zones.json', 'points.json'].map(fileName => {
    const filePath = assertInsidePath(path.join(paths.infoDir, fileName), paths.projectRoot, fileName);
    const exists = fs.existsSync(filePath);
    const stat = exists ? fs.statSync(filePath) : null;
    return {
      name: fileName,
      exists,
      size: stat?.size || 0,
      modifiedAt: stat ? new Date(stat.mtimeMs || Date.now()).toISOString() : ''
    };
  });
}

function getSqliteDatabaseInfo(paths) {
  const exists = fs.existsSync(paths.databasePath);
  const stat = exists ? fs.statSync(paths.databasePath) : null;
  return {
    name: path.basename(paths.databasePath),
    exists,
    size: stat?.size || 0,
    modifiedAt: stat ? new Date(stat.mtimeMs || Date.now()).toISOString() : ''
  };
}

function hasCompleteJsonProject(paths) {
  return getJsonProjectFiles(paths).every(file => file.exists);
}

function buildStorageInventory(paths, backupDir = '') {
  const jsonFiles = getJsonProjectFiles(paths);
  const jsonFilesExist = jsonFiles.every(file => file.exists);
  const sqliteDatabase = getSqliteDatabaseInfo(paths);
  const backupList = backupService.list({
    projectDir: paths.projectRoot,
    backupDir
  });
  const availableStorageFormats = [
    sqliteDatabase.exists ? 'sqlite' : '',
    jsonFilesExist ? 'json' : ''
  ].filter(Boolean);

  return {
    version: CONVERSION_SERVICE_VERSION,
    projectDir: paths.projectRoot,
    activeStorageFormat: sqliteDatabase.exists ? 'sqlite' : (jsonFilesExist ? 'json' : ''),
    databaseFile: path.basename(paths.databasePath),
    jsonFiles,
    jsonFilesExist,
    sqliteDatabase,
    databaseExists: sqliteDatabase.exists,
    availableStorageFormats,
    backupDir: backupList.backupDir,
    backupFiles: backupList.items,
    warnings: []
  };
}

function createDatabaseTempPath(databasePath) {
  return path.join(
    path.dirname(databasePath),
    `.data.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.db.tmp`
  );
}

function removeQuietly(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  } catch (_error) {
    // Best-effort cleanup only.
  }
}

function replaceFile(sourcePath, targetPath) {
  fs.copyFileSync(sourcePath, targetPath);
  removeQuietly(sourcePath);
}

function modelCounts(model = {}) {
  const tables = model.tables || {};
  return {
    settings: Array.isArray(tables.project_settings) ? tables.project_settings.length : 0,
    zones: Array.isArray(tables.zones) ? tables.zones.length : 0,
    points: Array.isArray(tables.points) ? tables.points.length : 0,
    phenologyEntries: Array.isArray(tables.phenology_entries) ? tables.phenology_entries.length : 0,
    imageReferences: Array.isArray(tables.images) ? tables.images.length : 0,
    taxonomyCandidates: Array.isArray(tables.taxonomy_candidates) ? tables.taxonomy_candidates.length : 0
  };
}

function writeMigrationReport(reportPath, report) {
  writeTextFileAtomic(reportPath, JSON.stringify(report, null, 2));
}

function buildReportBase(direction, paths, backup) {
  return {
    version: CONVERSION_SERVICE_VERSION,
    direction,
    generatedAt: new Date().toISOString(),
    databaseFile: path.basename(paths.databasePath),
    reportFile: path.basename(paths.reportPath),
    backupFile: backup?.filePath || '',
    projectChanged: true,
    rendererDatabaseAccess: false,
    exposesSql: false,
    warnings: []
  };
}

function loadCurrentJsonProject(projectRoot) {
  const project = projectStore.loadProject({ projectDir: projectRoot, storageFormat: 'json' });
  return {
    settings: project.settings,
    zones: project.zones,
    points: project.points
  };
}

function removeJsonProjectFiles(paths) {
  const removed = [];
  ['settings.json', 'zones.json', 'points.json'].forEach(fileName => {
    const filePath = assertInsidePath(path.join(paths.infoDir, fileName), paths.projectRoot, fileName);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
      removed.push(fileName);
    }
  });
  return removed;
}

function removeSqliteDatabase(paths) {
  if (!fs.existsSync(paths.databasePath)) {
    return false;
  }
  fs.rmSync(paths.databasePath, { force: true });
  return true;
}

/**
 * @param {StorageConversionPayload} payload
 * @returns {StorageArtifactInventory}
 */
function listStorageArtifacts(payload) {
  const safePayload = ensurePayload(payload);
  const paths = getStoragePaths(safePayload.projectDir);
  return buildStorageInventory(paths, safePayload.backupDir || '');
}

/**
 * @param {StorageArtifactDeletePayload} payload
 * @returns {Record<string, unknown>}
 */
function deleteStorageArtifacts(payload) {
  const safePayload = ensurePayload(payload);
  const paths = getStoragePaths(safePayload.projectDir);
  const deleteSqliteDatabase = safePayload.deleteSqliteDatabase === true;
  const deleteJsonFiles = safePayload.deleteJsonFiles === true;
  const backupPaths = Array.isArray(safePayload.backupPaths) ? safePayload.backupPaths : [];
  const backupNames = Array.isArray(safePayload.backupNames) ? safePayload.backupNames : [];
  const currentBackups = backupNames.length
    ? backupService.list({ projectDir: paths.projectRoot, backupDir: safePayload.backupDir || '' }).items
    : [];
  const backupTargets = [
    ...backupPaths,
    ...backupNames.map(name => currentBackups.find(item => item.name === path.basename(String(name || '')))?.path)
  ].filter(Boolean);
  const hasSqlite = fs.existsSync(paths.databasePath);
  const hasJson = hasCompleteJsonProject(paths);
  const selectedStorageCount = (deleteSqliteDatabase && hasSqlite ? 1 : 0)
    + (deleteJsonFiles && hasJson ? 1 : 0);
  const availableStorageCount = (hasSqlite ? 1 : 0) + (hasJson ? 1 : 0);

  if (selectedStorageCount > 0
    && availableStorageCount - selectedStorageCount <= 0
    && safePayload.allowDeleteOnlyStorage !== true) {
    throw new AppError(
      ERROR_CODES.INVALID_PAYLOAD,
      'Deleting the only available storage format requires explicit confirmation'
    );
  }

  const deleted = {
    sqliteDatabase: false,
    jsonFiles: [],
    backups: 0
  };

  if (backupTargets.length) {
    const result = backupService.deleteExpired({
      projectDir: paths.projectRoot,
      backupDir: safePayload.backupDir || '',
      paths: backupTargets
    });
    deleted.backups = result.deleted || 0;
  }
  if (deleteSqliteDatabase) {
    deleted.sqliteDatabase = removeSqliteDatabase(paths);
  }
  if (deleteJsonFiles) {
    deleted.jsonFiles = removeJsonProjectFiles(paths);
  }

  const inventory = buildStorageInventory(paths, safePayload.backupDir || '');
  logger.writeLog('warn', 'storage:delete-artifacts', 'storage artifacts deleted', {
    projectDir: paths.projectRoot,
    deleteSqliteDatabase,
    deleteJsonFiles,
    backupCount: backupTargets.length,
    deleted
  });

  return {
    status: 'completed',
    deleted,
    inventory,
    activeStorageFormat: inventory.activeStorageFormat,
    databaseExists: inventory.databaseExists,
    jsonFilesExist: inventory.jsonFilesExist,
    jsonFilesKept: inventory.jsonFilesExist,
    availableStorageFormats: inventory.availableStorageFormats,
    backupFiles: inventory.backupFiles,
    warnings: inventory.warnings
  };
}

/**
 * @param {StorageConversionPayload} payload
 * @returns {StorageConversionPreflight}
 */
function getPreflight(payload) {
  const safePayload = ensurePayload(payload);
  const paths = getStoragePaths(safePayload.projectDir);
  const project = projectStore.loadProject({
    projectDir: paths.projectRoot,
    storageFormat: fs.existsSync(paths.databasePath) && !fs.existsSync(path.join(paths.infoDir, 'settings.json'))
      ? 'sqlite'
      : 'json'
  });
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
  const validation = sqliteExchangeModel.validateSqliteExchangeModel(model);
  const conversionReport = sqliteExchangeModel.buildConversionReport(model, {
    direction: 'json-to-sqlite-preflight'
  });

  return {
    ok: validation.ok,
    version: CONVERSION_SERVICE_VERSION,
    projectDir: paths.projectRoot,
    databaseExists: fs.existsSync(paths.databasePath),
    jsonFilesExist: ['settings.json', 'zones.json', 'points.json']
      .every(fileName => fs.existsSync(path.join(paths.infoDir, fileName))),
    activeStorageFormat: project.storageFormat || 'json',
    databaseFile: path.basename(paths.databasePath),
    reportFile: path.basename(paths.reportPath),
    counts: conversionReport.counts,
    compatibility: conversionReport.compatibility,
    safety: {
      backupRequired: true,
      writesProjectDatabase: true,
      keepsJsonFiles: false,
      rendererDatabaseAccess: false,
      exposesSql: false
    },
    errors: validation.errors,
    warnings: conversionReport.warnings || []
  };
}

function openDatabase(Database, databasePath) {
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * @param {StorageConversionPayload} payload
 * @returns {StorageConversionReport}
 */
function createSqliteFromJson(payload) {
  const safePayload = ensurePayload(payload);
  const paths = getStoragePaths(safePayload.projectDir);
  const project = loadCurrentJsonProject(paths.projectRoot);
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
  const validation = sqliteExchangeModel.validateSqliteExchangeModel(model);
  if (!validation.ok) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, validation.errors.join('; '));
  }

  const backup = backupService.create({
    projectDir: paths.projectRoot,
    backupDir: safePayload.backupDir || '',
    label: JSON_TO_SQLITE_BACKUP_LABEL
  });

  const Database = require('better-sqlite3');
  const tempPath = createDatabaseTempPath(paths.databasePath);
  let db = null;

  try {
    db = openDatabase(Database, tempPath);
    const writtenRows = sqliteConversionService.writeModelToDatabase(db, model);
    const schemaValidation = sqliteSchemaService.validateSchemaTables(db);
    if (!schemaValidation.ok) {
      throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'SQLite schema validation failed');
    }
    db.close();
    db = null;
    replaceFile(tempPath, paths.databasePath);
    const removedSourceFiles = removeJsonProjectFiles(paths);

    const report = {
      ...buildReportBase('json-to-sqlite', paths, backup),
      sourceFormat: 'json-project',
      targetFormat: 'sqlite-database',
      status: 'completed',
      counts: modelCounts(model),
      writtenRows,
      schema: {
        ok: schemaValidation.ok,
        missingTables: schemaValidation.missingTables,
        missingColumns: schemaValidation.missingColumns
      },
      jsonFilesKept: false,
      removedSourceFiles,
      activeStorageFormat: 'sqlite'
    };
    writeMigrationReport(paths.reportPath, report);
    logger.writeLog('info', 'storage:json-to-sqlite', 'JSON project converted to SQLite storage', {
      projectDir: paths.projectRoot,
      databaseFile: report.databaseFile,
      backupFile: backup.filePath,
      removedSourceFiles
    });
    return report;
  } finally {
    if (db) {
      try {
        db.close();
      } catch (_error) {
        // Cleanup after a failed conversion should continue.
      }
    }
    removeQuietly(tempPath);
  }
}

function readSqliteModel(paths) {
  if (!fs.existsSync(paths.databasePath)) {
    throw new AppError(ERROR_CODES.FILE_NOT_FOUND, 'SQLite database file does not exist');
  }
  const Database = require('better-sqlite3');
  const db = openDatabase(Database, paths.databasePath);
  try {
    const schemaValidation = sqliteSchemaService.validateSchemaTables(db);
    if (!schemaValidation.ok) {
      throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'SQLite schema validation failed');
    }
    return {
      schemaValidation,
      model: sqliteConversionService.readModelFromDatabase(db)
    };
  } finally {
    db.close();
  }
}

/**
 * @param {StorageConversionPayload} payload
 * @returns {StorageConversionReport}
 */
function exportSqliteToJson(payload) {
  const safePayload = ensurePayload(payload);
  const paths = getStoragePaths(safePayload.projectDir);
  const { schemaValidation, model } = readSqliteModel(paths);
  const validation = sqliteExchangeModel.validateSqliteExchangeModel(model);
  if (!validation.ok) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, validation.errors.join('; '));
  }

  const backup = backupService.create({
    projectDir: paths.projectRoot,
    backupDir: safePayload.backupDir || '',
    label: SQLITE_TO_JSON_BACKUP_LABEL
  });

  const project = sqliteExchangeModel.buildJsonProjectFromSqliteModel(model);
  const saved = projectStore.saveProject({
    projectDir: paths.projectRoot,
    storageFormat: 'json',
    settings: /** @type {ProjectSettings} */ (project.settings),
    zones: project.zones,
    points: project.points
  });
  const removedDatabase = removeSqliteDatabase(paths);

  const report = {
    ...buildReportBase('sqlite-to-json', paths, backup),
    sourceFormat: 'sqlite-database',
    targetFormat: 'json-project',
    status: 'completed',
    counts: modelCounts(model),
    schema: {
      ok: schemaValidation.ok,
      missingTables: schemaValidation.missingTables,
      missingColumns: schemaValidation.missingColumns
    },
    removedSourceFiles: removedDatabase ? [path.basename(paths.databasePath)] : [],
    activeStorageFormat: 'json',
    projectModifiedTime: saved.projectModifiedTime || Date.now()
  };
  writeMigrationReport(paths.reportPath, report);
  logger.writeLog('info', 'storage:sqlite-to-json', 'SQLite storage exported to JSON project files', {
    projectDir: paths.projectRoot,
    databaseFile: report.databaseFile,
    backupFile: backup.filePath,
    removedSourceFiles: report.removedSourceFiles
  });
  return report;
}

module.exports = {
  CONVERSION_SERVICE_VERSION,
  SQLITE_DB_FILE,
  SQLITE_REPORT_FILE,
  JSON_TO_SQLITE_BACKUP_LABEL,
  SQLITE_TO_JSON_BACKUP_LABEL,
  getPreflight,
  listStorageArtifacts,
  deleteStorageArtifacts,
  createSqliteFromJson,
  exportSqliteToJson
};
