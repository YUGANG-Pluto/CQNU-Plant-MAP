const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const backupService = require('../../src/main/backupService');
const pathGuard = require('../../src/main/pathGuard');
const { ERROR_CODES } = require('../../src/main/errorCodes');

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-backup-test-'));
  const projectDir = path.join(root, 'project');
  const infoDir = path.join(projectDir, 'information');
  const backupDir = path.join(root, 'backups');
  fs.mkdirSync(infoDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(infoDir, 'settings.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(infoDir, 'zones.json'), '[]', 'utf8');
  fs.writeFileSync(path.join(infoDir, 'points.json'), '[]', 'utf8');
  pathGuard.trustProjectDirFromDialog(projectDir);
  pathGuard.trustBackupDirFromDialog(backupDir);
  return { root, projectDir, backupDir };
}

function expectCode(fn, code) {
  assert.throws(fn, error => error && error.code === code);
}

test('backup service creates unique zip backups', () => {
  const { root, projectDir, backupDir } = createWorkspace();
  const first = backupService.create({ projectDir, backupDir, label: 'manual' });
  const second = backupService.create({ projectDir, backupDir, label: 'manual' });

  assert.ok(first.filePath.endsWith('.zip'));
  assert.ok(fs.existsSync(first.filePath));
  assert.ok(fs.existsSync(second.filePath));
  assert.notEqual(first.filePath, second.filePath);

  fs.rmSync(root, { recursive: true, force: true });
});

test('backup service lists, keeps, and deletes only trusted zip backups', () => {
  const { root, projectDir, backupDir } = createWorkspace();
  const created = backupService.create({ projectDir, backupDir, label: 'expired' });
  const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  fs.utimesSync(created.filePath, oldDate, oldDate);

  const listed = backupService.listExpired({ projectDir, backupDir, days: 1 });
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].path, created.filePath);

  assert.equal(backupService.keepExpired({ projectDir, backupDir, paths: [created.filePath] }).updated, 1);
  assert.equal(backupService.listExpired({ projectDir, backupDir, days: 1 }).items.length, 0);

  fs.utimesSync(created.filePath, oldDate, oldDate);
  assert.equal(backupService.deleteExpired({ projectDir, backupDir, paths: [created.filePath] }).deleted, 1);
  assert.equal(fs.existsSync(created.filePath), false);

  fs.rmSync(root, { recursive: true, force: true });
});

test('backup service rejects path escapes and non-zip deletion targets', () => {
  const { root, projectDir, backupDir } = createWorkspace();
  const outside = path.join(root, 'outside.zip');
  const textFile = path.join(backupDir, 'note.txt');
  fs.writeFileSync(outside, 'outside', 'utf8');
  fs.writeFileSync(textFile, 'note', 'utf8');

  expectCode(() => backupService.deleteExpired({ projectDir, backupDir, paths: [outside] }), ERROR_CODES.PATH_OUT_OF_SCOPE);
  expectCode(() => backupService.deleteExpired({ projectDir, backupDir, paths: [textFile] }), ERROR_CODES.INVALID_BACKUP_FILE);

  fs.rmSync(root, { recursive: true, force: true });
});
