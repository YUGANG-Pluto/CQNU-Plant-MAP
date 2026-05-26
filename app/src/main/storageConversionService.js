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
      keepsJsonFiles: true,
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
    settings: project.settings,
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
  createSqliteFromJson,
  exportSqliteToJson
};
