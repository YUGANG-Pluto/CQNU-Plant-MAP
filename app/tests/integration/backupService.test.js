const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');

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

test('backup service stores default backups inside project statistics backup folder', () => {
  const { root, projectDir } = createWorkspace();
  const created = backupService.create({ projectDir, label: 'json_turn_sqlite' });
  const expectedRoot = path.join(projectDir, 'information', 'statistics', 'backup');
  const listed = backupService.list({ projectDir });

  assert.ok(created.filePath.startsWith(expectedRoot));
  assert.ok(path.basename(created.filePath).includes('json_turn_sqlite'));
  assert.ok(fs.existsSync(created.filePath));
  assert.equal(listed.backupDir, expectedRoot);
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].name, path.basename(created.filePath));

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

test('backup service inspects and restores selected project backup safely', () => {
  const { root, projectDir } = createWorkspace();
  const infoDir = path.join(projectDir, 'information');
  fs.writeFileSync(path.join(infoDir, 'settings.json'), JSON.stringify({ restored: true }), 'utf8');
  const created = backupService.create({ projectDir, label: 'manual' });
  fs.writeFileSync(path.join(infoDir, 'settings.json'), JSON.stringify({ restored: false }), 'utf8');
  fs.writeFileSync(path.join(infoDir, 'data.db'), 'stale sqlite', 'utf8');

  const plan = backupService.inspectRestorePlan({
    projectDir,
    backupName: path.basename(created.filePath)
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.hasJsonStorage, true);
  assert.equal(plan.hasSqliteStorage, false);
  assert.ok(plan.restoreFileCount >= 3);

  expectCode(() => backupService.restore({
    projectDir,
    backupName: path.basename(created.filePath)
  }), ERROR_CODES.INVALID_PAYLOAD);

  const restored = backupService.restore({
    projectDir,
    backupName: path.basename(created.filePath),
    confirmRestore: true
  });
  assert.equal(restored.status, 'completed');
  assert.ok(path.basename(restored.safetyBackupFile).includes('pre_restore'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(infoDir, 'settings.json'), 'utf8')).restored, true);
  assert.equal(fs.existsSync(path.join(infoDir, 'data.db')), false);

  fs.rmSync(root, { recursive: true, force: true });
});

test('backup restore inspection rejects unsafe zip entries', () => {
  const { root, projectDir } = createWorkspace();
  const backupRoot = path.join(projectDir, 'information', 'statistics', 'backup');
  fs.mkdirSync(backupRoot, { recursive: true });
  const unsafeZip = path.join(backupRoot, 'unsafe.zip');
  const zip = new AdmZip();
  zip.addFile('project/C:/escape.txt', Buffer.from('bad'));
  zip.writeZip(unsafeZip);

  expectCode(() => backupService.inspectRestorePlan({
    projectDir,
    backupName: 'unsafe.zip'
  }), ERROR_CODES.INVALID_BACKUP_FILE);

  fs.rmSync(root, { recursive: true, force: true });
});
