const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { BACKUP_EXPIRE_DAYS } = require('./constants');
const logger = require('./logger');
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
const RESTORE_SERVICE_VERSION = 'backup-restore-v1';
const RESTORE_MAX_FILES = 20000;
const RESTORE_MAX_BYTES = 2 * 1024 * 1024 * 1024;

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

function safeBackupName(name) {
  const baseName = path.basename(String(name || ''));
  if (!baseName || path.extname(baseName).toLowerCase() !== '.zip') {
    throw new AppError(ERROR_CODES.INVALID_BACKUP_FILE, 'Only zip backup files can be restored.');
  }
  return baseName;
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

function isExcludedFromBackup(filePath, excludeRoots) {
  return excludeRoots.some(root => {
    const relative = path.relative(root, filePath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
}

function addProjectFolderToZip(zip, projectRoot, projectName, currentDir, excludeRoots) {
  fs.readdirSync(currentDir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(currentDir, entry.name);
    if (isExcludedFromBackup(fullPath, excludeRoots)) {
      return;
    }
    if (entry.isDirectory()) {
      addProjectFolderToZip(zip, projectRoot, projectName, fullPath, excludeRoots);
      return;
    }
    if (!entry.isFile()) {
      return;
    }
    const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
    zip.addFile(`${projectName}/${relativePath}`, fs.readFileSync(fullPath));
  });
}

function writeBackupZip(projectRoot, projectName, zipPath, backupRoot) {
  const tempPath = createTempPath(zipPath);

  try {
    const zip = new AdmZip();
    addProjectFolderToZip(zip, projectRoot, projectName, projectRoot, [
      backupRoot,
      tempPath,
      zipPath
    ]);
    zip.writeZip(tempPath);
    copyFileExclusive(tempPath, zipPath);
  } catch (error) {
    removeQuietly(zipPath);
    throw error;
  } finally {
    removeQuietly(tempPath);
  }
}

function resolveBackupPayloadFile(projectRoot, payload = {}) {
  const backupRoot = normalizeBackupDir(projectRoot, payload.backupDir);
  const name = payload.backupName ? safeBackupName(payload.backupName) : '';
  const filePath = name ? path.join(backupRoot, name) : payload.backupPath;
  return resolveBackupFile(projectRoot, payload.backupDir, filePath, 'backup restore file');
}

function normalizeZipEntryName(entryName) {
  const clean = String(entryName || '').replace(/\\/g, '/');
  if (!clean || clean.startsWith('/') || /^[a-zA-Z]:/.test(clean)) {
    throw new AppError(ERROR_CODES.INVALID_BACKUP_FILE, 'Backup contains an invalid absolute entry path.');
  }
  const parts = clean.split('/').filter(Boolean);
  if (parts.some(part => part === '..' || part.includes(':'))) {
    throw new AppError(ERROR_CODES.INVALID_BACKUP_FILE, 'Backup contains an unsafe entry path.');
  }
  if (parts.length < 2) {
    return null;
  }
  return {
    rootName: parts[0],
    relativePath: parts.slice(1).join('/')
  };
}

function isRestoreBackupEntry(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').toLowerCase();
  return normalized === 'information/statistics/backup'
    || normalized.startsWith('information/statistics/backup/');
}

function inspectRestorePlan(payload = {}) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  const backupFile = resolveBackupPayloadFile(projectRoot, payload);
  if (!fs.existsSync(backupFile)) {
    throw new AppError(ERROR_CODES.FILE_NOT_FOUND, 'Backup file does not exist.');
  }

  const zip = new AdmZip(backupFile);
  const entries = zip.getEntries();
  const rootNames = new Set();
  const plannedEntries = [];
  let skippedBackupEntries = 0;
  let totalBytes = 0;
  let hasSqliteStorage = false;

  entries.forEach(entry => {
    const normalized = normalizeZipEntryName(entry.entryName);
    if (!normalized || entry.isDirectory) {
      return;
    }
    rootNames.add(normalized.rootName);
    if (isRestoreBackupEntry(normalized.relativePath)) {
      skippedBackupEntries += 1;
      return;
    }
    const targetPath = assertInsidePath(path.join(projectRoot, normalized.relativePath), projectRoot, 'restore target');
    const entrySize = Number(entry.header?.size || 0);
    totalBytes += entrySize;
    if (plannedEntries.length >= RESTORE_MAX_FILES || totalBytes > RESTORE_MAX_BYTES) {
      throw new AppError(ERROR_CODES.FILE_TOO_LARGE, 'Backup restore plan is too large.');
    }
    const normalizedRelative = normalized.relativePath.replace(/\\/g, '/');
    hasSqliteStorage = hasSqliteStorage || normalizedRelative === 'information/data.db';
    plannedEntries.push({
      entryName: entry.entryName,
      relativePath: normalized.relativePath,
      targetPath,
      size: entrySize
    });
  });

  const plannedPaths = new Set(plannedEntries.map(entry => entry.relativePath.replace(/\\/g, '/')));
  const hasCompleteJsonStorage = [
    'information/settings.json',
    'information/zones.json',
    'information/points.json'
  ].every(fileName => plannedPaths.has(fileName));
  const hasPartialJsonStorage = [
    'information/settings.json',
    'information/zones.json',
    'information/points.json'
  ].some(fileName => plannedPaths.has(fileName));
  const ok = plannedEntries.length > 0 && (hasSqliteStorage || hasCompleteJsonStorage);
  const warnings = [];
  if (hasPartialJsonStorage && !hasCompleteJsonStorage) {
    warnings.push('JSON project files are incomplete in the selected backup.');
  }
  if (!hasSqliteStorage && !hasCompleteJsonStorage) {
    warnings.push('The selected backup does not contain a readable SQLite database or complete JSON project files.');
  }
  if (skippedBackupEntries) {
    warnings.push('Backup directory entries will be skipped during restore.');
  }

  return {
    ok,
    version: RESTORE_SERVICE_VERSION,
    backupFile,
    backupName: path.basename(backupFile),
    projectDir: projectRoot,
    rootNames: [...rootNames],
    entryCount: entries.length,
    restoreFileCount: plannedEntries.length,
    skippedBackupEntries,
    totalBytes,
    hasSqliteStorage,
    hasJsonStorage: hasCompleteJsonStorage,
    createsSafetyBackup: true,
    requiresRestoreConfirmation: true,
    warnings,
    plannedEntries
  };
}

function assertRestorablePlan(plan) {
  if (!plan.ok) {
    throw new AppError(ERROR_CODES.INVALID_BACKUP_FILE, plan.warnings.join('; ') || 'Backup is not restorable.');
  }
}

function createRestoreTempRoot(projectRoot) {
  const tempRoot = path.join(
    projectRoot,
    'information',
    `.restore.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );
  assertInsidePath(tempRoot, projectRoot, 'restore temporary directory');
  ensureDirectory(tempRoot);
  return tempRoot;
}

function copyDirectoryOverlay(sourceRoot, targetRoot) {
  const copied = [];
  function visit(currentDir) {
    fs.readdirSync(currentDir, { withFileTypes: true }).forEach(entry => {
      const sourcePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(sourceRoot, sourcePath);
      const targetPath = assertInsidePath(path.join(targetRoot, relativePath), targetRoot, 'restore output');
      if (entry.isDirectory()) {
        ensureDirectory(targetPath);
        visit(sourcePath);
        return;
      }
      if (!entry.isFile()) {
        return;
      }
      ensureDirectory(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
      copied.push(relativePath.replace(/\\/g, '/'));
    });
  }
  visit(sourceRoot);
  return copied;
}

function removeStorageNotPresentInBackup(projectRoot, plan) {
  const removed = [];
  const infoDir = assertInsidePath(path.join(projectRoot, 'information'), projectRoot, 'project information');
  const sqlitePath = assertInsidePath(path.join(infoDir, 'data.db'), projectRoot, 'SQLite database');
  if (plan.hasSqliteStorage && !plan.hasJsonStorage) {
    ['settings.json', 'zones.json', 'points.json'].forEach(fileName => {
      const filePath = assertInsidePath(path.join(infoDir, fileName), projectRoot, fileName);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
        removed.push(fileName);
      }
    });
  }
  if (plan.hasJsonStorage && !plan.hasSqliteStorage && fs.existsSync(sqlitePath)) {
    fs.rmSync(sqlitePath, { force: true });
    removed.push('data.db');
  }
  return removed;
}

// 备份压缩包必须写入可信目录，并再次校验最终 zip 路径。
function create(payload) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  const backupRoot = normalizeBackupDir(projectRoot, payload.backupDir);
  ensureDirectory(backupRoot);

  const projectName = path.basename(projectRoot);
  const label = safeBackupLabel(payload.label);
  const zipPath = createBackupPath(backupRoot, projectName, label);
  writeBackupZip(projectRoot, projectName, zipPath, backupRoot);
  logger.writeLog('info', 'backup:create', 'project backup created', {
    projectDir: projectRoot,
    backupDir: backupRoot,
    filePath: zipPath,
    label
  });

  return {
    filePath: zipPath,
    backupDir: backupRoot
  };
}

function restore(payload = {}) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  if (payload.confirmRestore !== true) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, 'Backup restore requires explicit confirmation.');
  }
  const plan = inspectRestorePlan(payload);
  assertRestorablePlan(plan);

  const safetyBackup = create({
    projectDir: projectRoot,
    backupDir: payload.backupDir || '',
    label: 'pre_restore'
  });
  const zip = new AdmZip(plan.backupFile);
  const tempRoot = createRestoreTempRoot(projectRoot);

  try {
    plan.plannedEntries.forEach(item => {
      const entry = zip.getEntry(item.entryName);
      if (!entry || entry.isDirectory) {
        return;
      }
      const targetPath = assertInsidePath(path.join(tempRoot, item.relativePath), tempRoot, 'restore staging file');
      ensureDirectory(path.dirname(targetPath));
      fs.writeFileSync(targetPath, entry.getData());
    });
    const restoredFiles = copyDirectoryOverlay(tempRoot, projectRoot);
    const removedStorageFiles = removeStorageNotPresentInBackup(projectRoot, plan);

    logger.writeLog('warn', 'backup:restore', 'project restored from backup', {
      projectDir: projectRoot,
      backupFile: plan.backupFile,
      safetyBackup: safetyBackup.filePath,
      restoredFileCount: restoredFiles.length,
      removedStorageFiles
    });

    return {
      status: 'completed',
      version: RESTORE_SERVICE_VERSION,
      backupFile: plan.backupFile,
      backupName: plan.backupName,
      safetyBackupFile: safetyBackup.filePath,
      restoredFileCount: restoredFiles.length,
      removedStorageFiles,
      hasSqliteStorage: plan.hasSqliteStorage,
      hasJsonStorage: plan.hasJsonStorage,
      skippedBackupEntries: plan.skippedBackupEntries,
      warnings: plan.warnings
    };
  } finally {
    if (fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
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

function list(payload) {
  const projectRoot = assertTrustedProjectDir(payload.projectDir);
  const backupRoot = normalizeBackupDir(projectRoot, payload.backupDir);

  if (!fs.existsSync(backupRoot)) {
    return {
      backupDir: backupRoot,
      items: []
    };
  }

  const items = fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter(item => item.isFile() && item.name.toLowerCase().endsWith('.zip'))
    .map(item => {
      const filePath = path.join(backupRoot, item.name);
      const stat = fs.statSync(filePath);
      return {
        name: item.name,
        path: filePath,
        backupDir: backupRoot,
        size: stat.size || 0,
        mtimeMs: stat.mtimeMs || 0,
        modifiedAt: new Date(stat.mtimeMs || Date.now()).toISOString()
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return {
    backupDir: backupRoot,
    items
  };
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

  logger.writeLog('info', 'backup:keep', 'backup files kept', {
    projectDir: projectRoot,
    backupDir: payload.backupDir || '',
    count: updated
  });
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

  logger.writeLog('info', 'backup:delete', 'backup files deleted', {
    projectDir: projectRoot,
    backupDir: payload.backupDir || '',
    count: deleted
  });
  return { deleted };
}

module.exports = {
  create,
  list,
  inspectRestorePlan,
  restore,
  listExpired,
  keepExpired,
  deleteExpired
};
