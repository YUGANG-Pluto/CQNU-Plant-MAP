const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storageConversionService = require('../../src/main/storageConversionService');

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
