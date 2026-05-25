const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const pathGuard = require('../../src/main/pathGuard');
const { ERROR_CODES } = require('../../src/main/errorCodes');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'plant-pathguard-test-'));
}

function expectCode(fn, code) {
  assert.throws(fn, error => error && error.code === code);
}

test('project directory trust and root guards are enforced', () => {
  const root = tempRoot();
  const projectDir = path.join(root, 'project');
  fs.mkdirSync(projectDir, { recursive: true });

  expectCode(() => pathGuard.normalizeProjectDir(path.parse(process.cwd()).root), ERROR_CODES.INVALID_PROJECT_DIR);
  expectCode(() => pathGuard.assertTrustedProjectDir(projectDir), ERROR_CODES.UNTRUSTED_PROJECT_DIR);
  assert.equal(pathGuard.trustProjectDirFromDialog(projectDir), fs.realpathSync.native(projectDir));
  assert.equal(pathGuard.assertTrustedProjectDir(projectDir), fs.realpathSync.native(projectDir));

  fs.rmSync(root, { recursive: true, force: true });
});

test('project relative paths reject escapes and absolute inputs', () => {
  const root = tempRoot();
  const projectDir = path.join(root, 'project');
  fs.mkdirSync(projectDir, { recursive: true });

  expectCode(() => pathGuard.resolveProjectRelative(projectDir, '../escape.json'), ERROR_CODES.PATH_OUT_OF_SCOPE);
  expectCode(() => pathGuard.resolveProjectRelative(projectDir, path.join(root, 'outside.json')), ERROR_CODES.ABSOLUTE_PATH_REJECTED);
  expectCode(() => pathGuard.resolveProjectRelative(projectDir, 'C:escape.json'), ERROR_CODES.ABSOLUTE_PATH_REJECTED);
  assert.ok(pathGuard.resolveProjectRelative(projectDir, 'information/settings.json').endsWith(path.join('information', 'settings.json')));

  fs.rmSync(root, { recursive: true, force: true });
});

test('image, backup, import, and export path rules are enforced', () => {
  const root = tempRoot();
  const projectDir = path.join(root, 'project');
  const imageDir = path.join(projectDir, 'information', 'images');
  const backupDir = path.join(root, 'backups');
  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  const csvFile = path.join(root, 'points.csv');
  fs.writeFileSync(csvFile, 'id,name\n', 'utf8');
  const txtFile = path.join(root, 'points.txt');
  fs.writeFileSync(txtFile, 'text', 'utf8');

  assert.ok(pathGuard.resolveImageRelative(projectDir, 'information/images/a.jpg').endsWith(path.join('information', 'images', 'a.jpg')));
  expectCode(() => pathGuard.resolveImageRelative(projectDir, 'information/images/a.exe'), ERROR_CODES.INVALID_FILE_TYPE);
  expectCode(() => pathGuard.normalizeBackupDir(projectDir, path.join(projectDir, 'backup')), ERROR_CODES.INVALID_PATH);
  expectCode(() => pathGuard.normalizeBackupDir(projectDir, backupDir), ERROR_CODES.UNTRUSTED_BACKUP_DIR);
  pathGuard.trustBackupDirFromDialog(backupDir);
  assert.equal(pathGuard.normalizeBackupDir(projectDir, backupDir), fs.realpathSync.native(backupDir));
  assert.equal(pathGuard.normalizeImportFile(csvFile, 'csv'), fs.realpathSync.native(csvFile));
  expectCode(() => pathGuard.normalizeImportFile(txtFile, 'csv'), ERROR_CODES.INVALID_FILE_TYPE);
  assert.ok(pathGuard.normalizeExportFile(path.join(root, 'export'), new Set(['.json']), 'json').endsWith('export.json'));
  expectCode(() => pathGuard.normalizeExportFile(path.join(root, 'export.exe'), new Set(['.json']), 'json'), ERROR_CODES.INVALID_EXPORT_FILE_TYPE);

  fs.rmSync(root, { recursive: true, force: true });
});
