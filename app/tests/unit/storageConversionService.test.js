const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageConversionService = require('../../src/main/storageConversionService');
const pathGuard = require('../../src/main/pathGuard');

test('storage conversion service exposes stable file names and version', () => {
  assert.equal(storageConversionService.CONVERSION_SERVICE_VERSION, 'storage-conversion-v1');
  assert.equal(storageConversionService.SQLITE_DB_FILE, 'data.db');
  assert.equal(storageConversionService.SQLITE_REPORT_FILE, 'sqlite-conversion-report.json');
  assert.equal(storageConversionService.JSON_TO_SQLITE_BACKUP_LABEL, 'json_turn_sqlite');
  assert.equal(storageConversionService.SQLITE_TO_JSON_BACKUP_LABEL, 'sqlite_turn_json');
});

test('storage conversion source keeps database work behind main-process helpers', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'main', 'storageConversionService.js'),
    'utf8'
  );

  assert.ok(source.includes('assertTrustedProjectDir'));
  assert.ok(source.includes('backupService.create'));
  assert.ok(source.includes('better-sqlite3'));
  assert.ok(source.includes('rendererDatabaseAccess: false'));
  assert.ok(source.includes('exposesSql: false'));
  assert.ok(!source.includes('ipcMain'));
});

test('storage artifact inventory and guarded cleanup stay project scoped', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-storage-artifacts-'));
  const projectDir = path.join(root, 'project');
  const infoDir = path.join(projectDir, 'information');
  fs.mkdirSync(infoDir, { recursive: true });
  fs.writeFileSync(path.join(infoDir, 'settings.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(infoDir, 'zones.json'), '[]', 'utf8');
  fs.writeFileSync(path.join(infoDir, 'points.json'), '[]', 'utf8');
  fs.writeFileSync(path.join(infoDir, 'data.db'), 'not-real-db', 'utf8');
  pathGuard.trustProjectDirFromDialog(projectDir);

  try {
    const inventory = storageConversionService.listStorageArtifacts({ projectDir });
    assert.equal(inventory.jsonFilesExist, true);
    assert.equal(inventory.databaseExists, true);
    assert.deepEqual(inventory.availableStorageFormats.sort(), ['json', 'sqlite']);

    assert.throws(() => storageConversionService.deleteStorageArtifacts({
      projectDir,
      deleteSqliteDatabase: true,
      deleteJsonFiles: true
    }));

    const deleted = storageConversionService.deleteStorageArtifacts({
      projectDir,
      deleteSqliteDatabase: true,
      allowDeleteOnlyStorage: false
    });
    assert.equal(deleted.deleted.sqliteDatabase, true);
    assert.equal(fs.existsSync(path.join(infoDir, 'data.db')), false);
    assert.equal(fs.existsSync(path.join(infoDir, 'settings.json')), true);

    const removedJson = storageConversionService.deleteStorageArtifacts({
      projectDir,
      deleteJsonFiles: true,
      allowDeleteOnlyStorage: true
    });
    assert.deepEqual(removedJson.availableStorageFormats, []);
    assert.equal(removedJson.activeStorageFormat, '');
    assert.equal(removedJson.jsonFilesExist, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
