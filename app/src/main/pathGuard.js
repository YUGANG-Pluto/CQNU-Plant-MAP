const fs = require('fs');
const path = require('path');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const {
  PROJECT_INFO_DIR,
  PROJECT_IMAGES_DIR,
  SETTINGS_FILE,
  ZONES_FILE,
  POINTS_FILE,
  IMAGE_EXTENSIONS,
  CSV_EXTENSIONS,
  GEOJSON_EXTENSIONS
} = require('./constants');

const PROJECT_FILES = new Set([SETTINGS_FILE, ZONES_FILE, POINTS_FILE]);

// 手动备份目录只在本次运行中信任，避免 renderer 持久化任意写入位置。
const trustedBackupDirs = new Set();

function asNonEmptyString(value, label) {
  if (typeof value !== 'string') {
    throw new AppError(ERROR_CODES.INVALID_PATH, `${label}必须是字符串。`);
  }

  const text = value.trim();
  if (!text) {
    throw new AppError(ERROR_CODES.INVALID_PATH, `${label}不能为空。`);
  }
  return text;
}

function normalizeNativePath(inputPath, label = '路径') {
  return path.resolve(asNonEmptyString(inputPath, label));
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function findNearestExistingPath(targetPath) {
  let current = normalizeNativePath(targetPath, '路径');

  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      return current;
    }
    current = parent;
  }

  return current;
}

function realpathForExistingOrParent(targetPath) {
  const normalized = normalizeNativePath(targetPath, '路径');
  const existing = findNearestExistingPath(normalized);
  const realExisting = fs.realpathSync.native(existing);
  const rest = path.relative(existing, normalized);
  return rest ? path.resolve(realExisting, rest) : realExisting;
}

function isSubPath(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isInsidePath(candidate, root) {
  const normalizedCandidate = normalizeNativePath(candidate, '目标路径');
  const normalizedRoot = normalizeNativePath(root, '根目录');
  const realCandidate = realpathForExistingOrParent(normalizedCandidate);
  const realRoot = realpathForExistingOrParent(normalizedRoot);

  return isSubPath(normalizedCandidate, normalizedRoot) && isSubPath(realCandidate, realRoot);
}

function assertInsidePath(candidate, root, label = '路径') {
  const normalized = normalizeNativePath(candidate, label);
  if (!isInsidePath(normalized, root)) {
    throw new AppError(ERROR_CODES.PATH_OUT_OF_SCOPE, `${label}不在允许目录范围内。`);
  }
  return normalized;
}

function assertExistingFile(filePath, label = '文件') {
  const normalized = normalizeNativePath(filePath, label);
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) {
    throw new AppError(ERROR_CODES.FILE_NOT_FOUND, `${label}不存在。`);
  }
  return fs.realpathSync.native(normalized);
}

function assertAllowedExtension(filePath, allowed, label) {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowed.has(ext)) {
    throw new AppError(ERROR_CODES.INVALID_FILE_TYPE, `${label}文件类型不允许。`);
  }
  return filePath;
}

// 项目目录拒绝磁盘根目录，避免全盘被视为可读写边界。
function normalizeProjectDir(projectDir) {
  const root = normalizeNativePath(projectDir, '项目目录');
  if (root === path.parse(root).root) {
    throw new AppError(ERROR_CODES.INVALID_PROJECT_DIR, '项目目录不能是磁盘根目录。');
  }
  return root;
}

function getProjectInfoDir(projectDir) {
  return path.join(normalizeProjectDir(projectDir), PROJECT_INFO_DIR);
}

function getProjectImagesDir(projectDir) {
  return path.join(normalizeProjectDir(projectDir), PROJECT_IMAGES_DIR);
}

// 相对路径先拼接再反向校验，阻断 ../ 与绝对路径逃逸。
function resolveProjectRelative(projectDir, relativePath, label = '项目相对路径') {
  const root = normalizeProjectDir(projectDir);
  const relative = asNonEmptyString(relativePath, label);

  if (path.isAbsolute(relative) || /^[a-zA-Z]:/.test(relative)) {
    throw new AppError(ERROR_CODES.ABSOLUTE_PATH_REJECTED, `${label}必须是相对路径。`);
  }

  if (relative.includes(':')) {
    throw new AppError(ERROR_CODES.INVALID_PATH, `${label}不能包含冒号。`);
  }

  const normalizedRelative = path.normalize(relative).replace(/^([/\\])+/, '');
  return assertInsidePath(path.join(root, normalizedRelative), root, label);
}

// 项目数据文件白名单固定为三类 JSON，避免新增隐式读写入口。
function resolveProjectFile(projectDir, fileName, label) {
  if (!PROJECT_FILES.has(fileName)) {
    throw new AppError(ERROR_CODES.INVALID_PROJECT_FILE, `${label}不是允许的项目数据文件。`);
  }
  return resolveProjectRelative(projectDir, path.join(PROJECT_INFO_DIR, fileName), label);
}

// 图片删除只能落在 information/images 内，且扩展名必须匹配白名单。
function resolveImageRelative(projectDir, relativePath, label = '图片路径') {
  const imagePath = resolveProjectRelative(projectDir, relativePath, label);
  assertInsidePath(imagePath, getProjectImagesDir(projectDir), label);
  return assertAllowedExtension(imagePath, IMAGE_EXTENSIONS, label);
}

function getDefaultBackupDir(projectDir) {
  const root = normalizeProjectDir(projectDir);
  return path.join(path.dirname(root), `${path.basename(root)}_backups`);
}

function assertBackupDirOutsideProject(projectDir, backupDir) {
  const projectRoot = normalizeProjectDir(projectDir);
  const backupRoot = realpathForExistingOrParent(backupDir);
  if (isInsidePath(backupRoot, projectRoot)) {
    throw new AppError(ERROR_CODES.INVALID_PATH, '备份目录不能位于项目目录内。');
  }
  return backupRoot;
}

function trustBackupDirFromDialog(dirPath) {
  const normalized = normalizeNativePath(dirPath, '备份目录');
  const realDir = fs.existsSync(normalized) ? fs.realpathSync.native(normalized) : normalized;
  trustedBackupDirs.add(realDir);
  return realDir;
}

// 默认备份目录由项目目录推导，手动目录必须来自本次运行的系统选择器。
function normalizeBackupDir(projectDir, backupDir) {
  if (backupDir === undefined || backupDir === null || backupDir === '') {
    return assertBackupDirOutsideProject(projectDir, getDefaultBackupDir(projectDir));
  }

  const realDir = assertBackupDirOutsideProject(projectDir, backupDir);
  if (!trustedBackupDirs.has(realDir)) {
    throw new AppError(
      ERROR_CODES.UNTRUSTED_BACKUP_DIR,
      '备份目录必须由系统目录选择器返回。'
    );
  }
  return realDir;
}

// 过期备份清理只处理可信目录内的 zip，避免误删普通文件。
function resolveBackupFile(projectDir, backupDir, filePath, label = '备份文件') {
  const root = normalizeBackupDir(projectDir, backupDir);
  const normalized = assertInsidePath(filePath, root, label);
  if (path.extname(normalized).toLowerCase() !== '.zip') {
    throw new AppError(ERROR_CODES.INVALID_BACKUP_FILE, '只能处理 zip 备份文件。');
  }
  return normalized;
}

function normalizeImportFile(filePath, kind) {
  const normalized = assertExistingFile(filePath, '导入文件');
  if (kind === 'csv') {
    return assertAllowedExtension(normalized, CSV_EXTENSIONS, 'CSV');
  }
  return assertAllowedExtension(normalized, GEOJSON_EXTENSIONS, 'GeoJSON');
}

function normalizeSelectedImage(filePath) {
  const normalized = assertExistingFile(filePath, '图片文件');
  return assertAllowedExtension(normalized, IMAGE_EXTENSIONS, '图片');
}

function appendDefaultExtension(filePath, defaultExtension) {
  const suffix = defaultExtension.startsWith('.') ? defaultExtension : `.${defaultExtension}`;
  return `${filePath}${suffix}`;
}

function normalizeExportFile(filePath, allowed, defaultExtension) {
  const normalized = normalizeNativePath(filePath, '导出文件');
  const ext = path.extname(normalized).toLowerCase();

  if (!ext) {
    return appendDefaultExtension(normalized, defaultExtension);
  }

  if (!allowed.has(ext)) {
    throw new AppError(ERROR_CODES.INVALID_EXPORT_FILE_TYPE, '导出文件类型不允许。');
  }

  return normalized;
}

module.exports = {
  ensureDirectory,
  isInsidePath,
  assertInsidePath,
  realpathForExistingOrParent,
  normalizeProjectDir,
  getProjectInfoDir,
  getProjectImagesDir,
  resolveProjectRelative,
  resolveProjectFile,
  resolveImageRelative,
  getDefaultBackupDir,
  trustBackupDirFromDialog,
  normalizeBackupDir,
  resolveBackupFile,
  normalizeImportFile,
  normalizeSelectedImage,
  normalizeExportFile
};
