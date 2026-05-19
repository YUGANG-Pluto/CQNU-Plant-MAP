const fs = require('fs');
const path = require('path');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const { defaultSettings, SETTINGS_FILE, ZONES_FILE, POINTS_FILE } = require('./constants');
const { writeTextFileAtomic } = require('./fileWrite');
const {
  ensureDirectory,
  assertTrustedProjectDir,
  getProjectInfoDir,
  getProjectImagesDir,
  resolveProjectFile
} = require('./pathGuard');

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const text = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AppError(ERROR_CODES.INVALID_JSON, `${path.basename(filePath)} 不是有效 JSON。`, error);
  }
}

function writeJson(filePath, data) {
  writeTextFileAtomic(filePath, JSON.stringify(data, null, 2));
}

// information 目录固定承载三份项目数据，确保旧项目可直接加载。
function ensureProjectStructure(projectDir) {
  const root = assertTrustedProjectDir(projectDir);
  const infoDir = getProjectInfoDir(root);
  const imagesDir = getProjectImagesDir(root);

  ensureDirectory(root);
  ensureDirectory(infoDir);
  ensureDirectory(imagesDir);

  const settingsPath = resolveProjectFile(root, SETTINGS_FILE, '设置文件');
  const zonesPath = resolveProjectFile(root, ZONES_FILE, '分区文件');
  const pointsPath = resolveProjectFile(root, POINTS_FILE, '点位文件');

  if (!fs.existsSync(settingsPath)) {
    writeJson(settingsPath, defaultSettings());
  }
  if (!fs.existsSync(zonesPath)) {
    writeJson(zonesPath, []);
  }
  if (!fs.existsSync(pointsPath)) {
    writeJson(pointsPath, []);
  }

  return {
    root,
    infoDir,
    imagesDir,
    settingsPath,
    zonesPath,
    pointsPath
  };
}

function computeProjectModifiedTime(projectDir) {
  const paths = ensureProjectStructure(projectDir);
  let latest = 0;

  function walk(dirPath) {
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
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, `${label}必须是数组。`);
  }
  return value;
}

function normalizeSettings(value) {
  if (value === undefined || value === null) {
    return defaultSettings();
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'settings必须是对象。');
  }
  return value;
}

// 读取阶段不改变旧数据形态，兼容转换留给 renderer normalize 层。
function loadProject(payload) {
  const projectDir = typeof payload === 'string' ? payload : payload.projectDir;
  const paths = ensureProjectStructure(projectDir);

  return {
    projectDir: paths.root,
    infoDir: paths.infoDir,
    imagesDir: paths.imagesDir,
    settings: readJson(paths.settingsPath, defaultSettings()),
    zones: readJson(paths.zonesPath, []),
    points: readJson(paths.pointsPath, []),
    projectModifiedTime: computeProjectModifiedTime(paths.root)
  };
}

function saveProject(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '保存项目参数无效。');
  }

  const paths = ensureProjectStructure(payload.projectDir);
  const settings = normalizeSettings(payload.settings);
  const zones = normalizeArray(payload.zones, 'zones');
  const points = normalizeArray(payload.points, 'points');

  writeJson(paths.settingsPath, settings);
  writeJson(paths.zonesPath, zones);
  writeJson(paths.pointsPath, points);

  return {
    projectDir: paths.root,
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
  computeProjectModifiedTime
};
