const fs = require('fs');
const path = require('path');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const { defaultSettings, SETTINGS_FILE, ZONES_FILE, POINTS_FILE } = require('./constants');
const { writeTextFileAtomic } = require('./fileWrite');
const sqliteConversionService = require('./sqliteConversionService');
const sqliteExchangeModel = require('./sqliteExchangeModel');
const sqliteSchemaService = require('./sqliteSchemaService');
const {
  ensureDirectory,
  assertTrustedProjectDir,
  getProjectInfoDir,
  getProjectImagesDir,
  resolveProjectFile
} = require('./pathGuard');

const SQLITE_DB_FILE = 'data.db';

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const text = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AppError(ERROR_CODES.INVALID_JSON, `${path.basename(filePath)} is not valid JSON`, error);
  }
}

function writeJson(filePath, data) {
  writeTextFileAtomic(filePath, JSON.stringify(data, null, 2));
}

function getProjectPaths(projectDir, options = {}) {
  const root = assertTrustedProjectDir(projectDir);
  const infoDir = getProjectInfoDir(root);
  const imagesDir = getProjectImagesDir(root);

  ensureDirectory(root);
  ensureDirectory(infoDir);
  ensureDirectory(imagesDir);

  const settingsPath = resolveProjectFile(root, SETTINGS_FILE, 'settings file');
  const zonesPath = resolveProjectFile(root, ZONES_FILE, 'zones file');
  const pointsPath = resolveProjectFile(root, POINTS_FILE, 'points file');
  const databasePath = path.join(infoDir, SQLITE_DB_FILE);

  if (options.createJsonFiles !== false) {
    if (!fs.existsSync(settingsPath)) {
      writeJson(settingsPath, defaultSettings());
    }
    if (!fs.existsSync(zonesPath)) {
      writeJson(zonesPath, []);
    }
    if (!fs.existsSync(pointsPath)) {
      writeJson(pointsPath, []);
    }
  }

  return {
    root,
    infoDir,
    imagesDir,
    settingsPath,
    zonesPath,
    pointsPath,
    databasePath
  };
}

function ensureProjectStructure(projectDir) {
  return getProjectPaths(projectDir, { createJsonFiles: true });
}

function jsonFilesExist(paths) {
  return [paths.settingsPath, paths.zonesPath, paths.pointsPath]
    .every(filePath => fs.existsSync(filePath));
}

function jsonFilesPartial(paths) {
  const checks = [paths.settingsPath, paths.zonesPath, paths.pointsPath]
    .map(filePath => fs.existsSync(filePath));
  return checks.some(Boolean) && !checks.every(Boolean);
}

function databaseExists(paths) {
  return fs.existsSync(paths.databasePath);
}

function openDatabase(databasePath) {
  const Database = require('better-sqlite3');
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  return db;
}

function loadSqliteProject(paths) {
  if (!databaseExists(paths)) {
    throw new AppError(ERROR_CODES.FILE_NOT_FOUND, 'SQLite database file does not exist');
  }
  const db = openDatabase(paths.databasePath);
  try {
    const schemaValidation = sqliteSchemaService.validateSchemaTables(db);
    if (!schemaValidation.ok) {
      throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'SQLite schema validation failed');
    }
    const model = sqliteConversionService.readModelFromDatabase(db);
    const validation = sqliteExchangeModel.validateSqliteExchangeModel(model);
    if (!validation.ok) {
      throw new AppError(ERROR_CODES.INVALID_PAYLOAD, validation.errors.join('; '));
    }
    return sqliteExchangeModel.buildJsonProjectFromSqliteModel(model);
  } finally {
    db.close();
  }
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

function writeSqliteProject(paths, project) {
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
  const validation = sqliteExchangeModel.validateSqliteExchangeModel(model);
  if (!validation.ok) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, validation.errors.join('; '));
  }

  const tempPath = createDatabaseTempPath(paths.databasePath);
  let db = null;
  try {
    db = openDatabase(tempPath);
    sqliteConversionService.writeModelToDatabase(db, model);
    const schemaValidation = sqliteSchemaService.validateSchemaTables(db);
    if (!schemaValidation.ok) {
      throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'SQLite schema validation failed');
    }
    db.close();
    db = null;
    replaceFile(tempPath, paths.databasePath);
  } finally {
    if (db) {
      try {
        db.close();
      } catch (_error) {
        // Cleanup after a failed write should continue.
      }
    }
    removeQuietly(tempPath);
  }
}

function readJsonProject(paths) {
  if (jsonFilesPartial(paths)) {
    throw new AppError(ERROR_CODES.FILE_NOT_FOUND, 'Project JSON files are incomplete');
  }
  if (!jsonFilesExist(paths)) {
    throw new AppError(ERROR_CODES.FILE_NOT_FOUND, 'Project JSON files do not exist');
  }
  return {
    settings: readJson(paths.settingsPath, defaultSettings()),
    zones: readJson(paths.zonesPath, []),
    points: readJson(paths.pointsPath, [])
  };
}

function computeProjectModifiedTime(projectDir) {
  const paths = getProjectPaths(projectDir, { createJsonFiles: false });
  let latest = 0;

  function walk(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return;
    }
    const children = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const child of children) {
      const fullPath = path.join(dirPath, child.name);
      const stat = fs.statSync(fullPath);
      latest = Math.max(latest, stat.mtimeMs || 0);
      if (child.isDirectory()) {
        walk(fullPath);
      }
    }
  }

  walk(paths.infoDir);
  return latest || fs.statSync(paths.root).mtimeMs || Date.now();
}

function normalizeArray(value, label) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, `${label} must be an array`);
  }
  return value;
}

function normalizeSettings(value) {
  if (value === undefined || value === null) {
    return defaultSettings();
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'settings must be an object');
  }
  return value;
}

function resolveStorageFormat(paths, requestedFormat) {
  const format = requestedFormat || 'auto';
  if (format === 'sqlite') {
    return 'sqlite';
  }
  if (format === 'json') {
    return 'json';
  }
  return databaseExists(paths) ? 'sqlite' : 'json';
}

function loadProject(payload) {
  const projectDir = typeof payload === 'string' ? payload : payload.projectDir;
  const requestedFormat = typeof payload === 'string' ? 'auto' : payload.storageFormat;
  const paths = getProjectPaths(projectDir, { createJsonFiles: false });
  const resolvedFormat = resolveStorageFormat(paths, requestedFormat);

  let project;
  let storageFormat = resolvedFormat;
  if (resolvedFormat === 'sqlite') {
    project = loadSqliteProject(paths);
  } else {
    if (!jsonFilesExist(paths) && !databaseExists(paths) && requestedFormat !== 'json') {
      ensureProjectStructure(paths.root);
    }
    project = readJsonProject(paths);
    storageFormat = 'json';
  }

  return {
    projectDir: paths.root,
    infoDir: paths.infoDir,
    imagesDir: paths.imagesDir,
    settings: project.settings,
    zones: project.zones,
    points: project.points,
    storageFormat,
    jsonFilesExist: jsonFilesExist(paths),
    sqliteDatabaseExists: databaseExists(paths),
    projectModifiedTime: computeProjectModifiedTime(paths.root)
  };
}

function saveProject(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'save project payload is invalid');
  }

  const paths = getProjectPaths(payload.projectDir, { createJsonFiles: false });
  const settings = normalizeSettings(payload.settings);
  const zones = normalizeArray(payload.zones, 'zones');
  const points = normalizeArray(payload.points, 'points');
  const storageFormat = resolveStorageFormat(paths, payload.storageFormat);
  const project = { settings, zones, points };

  if (storageFormat === 'sqlite') {
    writeSqliteProject(paths, project);
  } else {
    ensureProjectStructure(paths.root);
    writeJson(paths.settingsPath, settings);
    writeJson(paths.zonesPath, zones);
    writeJson(paths.pointsPath, points);
  }

  return {
    projectDir: paths.root,
    storageFormat,
    jsonFilesExist: jsonFilesExist(paths),
    sqliteDatabaseExists: databaseExists(paths),
    projectModifiedTime: computeProjectModifiedTime(paths.root)
  };
}

function getModifiedTime(payload) {
  return {
    modifiedTime: computeProjectModifiedTime(payload.projectDir)
  };
}

module.exports = {
  ensureProjectStructure,
  loadProject,
  saveProject,
  getModifiedTime,
  computeProjectModifiedTime,
  SQLITE_DB_FILE
};
