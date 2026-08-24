const test = require('node:test');
const assert = require('node:assert/strict');

const sqliteSchemaService = require('../../src/main/sqliteSchemaService');

test('sqlite schema service exposes the expected readiness tables', () => {
  assert.equal(sqliteSchemaService.SCHEMA_VERSION, 'sqlite-schema-v1');
  assert.deepEqual(sqliteSchemaService.getExpectedTables(), [
    'project_settings',
    'zones',
    'points',
    'phenology_entries',
    'images',
    'point_images',
    'taxonomy_candidates',
    'export_runs'
  ]);
});

test('sqlite schema SQL creates every expected table without requiring the native module', () => {
  const sql = sqliteSchemaService.createSchemaSql();

  sqliteSchemaService.getExpectedTables().forEach(tableName => {
    assert.ok(
      sql.includes(`CREATE TABLE IF NOT EXISTS ${tableName}`),
      `schema SQL must create ${tableName}`
    );
  });
  assert.ok(sql.includes('family TEXT'));
  assert.ok(sql.includes('genus TEXT'));
  assert.ok(sql.includes('taxonomy_verification_status TEXT'));
  assert.ok(sql.includes('FOREIGN KEY (point_internal_key) REFERENCES points(internal_key)'));
  assert.ok(!sql.includes('DROP TABLE'));
});

test('sqlite schema table-name validation reports missing tables clearly', () => {
  const complete = sqliteSchemaService.validateSchemaTableNames(sqliteSchemaService.getExpectedTables());
  const missing = sqliteSchemaService.validateSchemaTableNames(['project_settings', 'zones']);

  assert.equal(complete.ok, true);
  assert.deepEqual(complete.missingTables, []);
  assert.equal(missing.ok, false);
  assert.ok(missing.missingTables.includes('points'));
  assert.ok(missing.missingTables.includes('taxonomy_candidates'));
});

test('sqlite schema temporary database check remains callable as an Electron runtime gate', () => {
  assert.equal(typeof sqliteSchemaService.checkSchemaInTemporaryDatabase, 'function');
});
