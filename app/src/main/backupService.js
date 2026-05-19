const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { BACKUP_EXPIRE_DAYS } = require('./constants');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const {
  ensureDirectory,
  assertTrustedProjectDir,
  normalizeBackupDir,
  resolveBackupFile,
  assertInsidePath
} = require('./pathGuard');
const { createTempPath, copyFileExclusive, removeQuietly } = require('./fileWrite');

const BACKUP_PATH_ATTEMPTS = 20;

function timestampSlug() {
  const date = new Date();
  const pad = value => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

function safeBackupLabel(label) {
  return String(label || 'backup').replace(/[^a-zA-Z0-9_\-一-龥]/g, '_');
}

function normalizeExpireDays(value) {
  if (value === undefined || value === null || value === '') {
    return BACKUP_EXPIRE_DAYS;
  }

  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '备份过期天数无效。');
  }
  return days;
}

function createBackupPath(backupRoot, projectName, label) {
  const baseName = `${projectName}_${label}_${timestampSlug()}`;

  for (let attempt = 0; attempt < BACKUP_PATH_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? '' : `_${attempt}`;
    const zipPath = path.join(backupRoot, `${baseName}${suffix}.zip`);
    assertInsidePath(zipPath, backupRoot, '备份压缩包');
    if (!fs.existsSync(zipPath)) {
      return zipPath;
    }
  }

  throw new AppError(ERROR_CODES.INTERNAL_ERROR, '无法生成唯一备份文件名。');
}

function writeBackupZip(projectRoot, projectName, zipPath) {
  const tempPath = createTempPath(zipPath);

  try {
    const zip = new AdmZip();
    zip.addLocalFolder(projectRoot, projectName);
    zip.writeZip(tempPath);
    copyFileExclusive(tempPath, zipPath);
  } catch (error) {
    removeQuietly(zipPath);
    throw error;
  } finally {
    removeQuietly(tempPath);
  }
}

// 备份压缩包必须写入可信目录，并再次校验最终 zip 路径。
function create(payload) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  const backupRoot = normalizeBackupDir(projectRoot, payload.backupDir);
  ensureDirectory(backupRoot);

  const projectName = path.basename(projectRoot);
  const label = safeBackupLabel(payload.label);
  const zipPath = createBackupPath(backupRoot, projectName, label);
  writeBackupZip(projectRoot, projectName, zipPath);

  return {
    filePath: zipPath,
    backupDir: backupRoot
  };
}

// 过期判断基于修改时间，便于“再保留 7 天”通过 utime 实现。
function listExpired(payload) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  const backupRoot = normalizeBackupDir(projectRoot, payload.backupDir);
  const expireMs = normalizeExpireDays(payload.days) * 24 * 60 * 60 * 1000;

  if (!fs.existsSync(backupRoot)) {
    return { items: [] };
  }

  const now = Date.now();
  const items = fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter(item => item.isFile() && item.name.toLowerCase().endsWith('.zip'))
    .map(item => {
      const filePath = path.join(backupRoot, item.name);
      const stat = fs.statSync(filePath);
      return {
        name: item.name,
        path: filePath,
        backupDir: backupRoot,
        mtimeMs: stat.mtimeMs || 0
      };
    })
    .filter(item => now - item.mtimeMs > expireMs);

  return { items };
}

function keepExpired(payload) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  const files = Array.isArray(payload.paths) ? payload.paths : [];
  const now = new Date();
  let updated = 0;

  for (const filePath of files) {
    const fullPath = resolveBackupFile(
      projectRoot,
      payload.backupDir,
      filePath,
      '备份文件'
    );

    if (fs.existsSync(fullPath)) {
      fs.utimesSync(fullPath, now, now);
      updated += 1;
    }
  }

  return { updated };
}

// 删除前逐个确认 zip 位于可信备份目录内，避免批量路径注入。
function deleteExpired(payload) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  const files = Array.isArray(payload.paths) ? payload.paths : [];
  let deleted = 0;

  for (const filePath of files) {
    const fullPath = resolveBackupFile(
      projectRoot,
      payload.backupDir,
      filePath,
      '备份文件'
    );

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      deleted += 1;
    }
  }

  return { deleted };
}

module.exports = {
  create,
  listExpired,
  keepExpired,
  deleteExpired
};
