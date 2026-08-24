const test = require('node:test');
const assert = require('node:assert/strict');

const sqliteConversionService = require('../../src/main/sqliteConversionService');

test('sqlite conversion service keeps the temporary conversion table scope explicit', () => {
  assert.deepEqual(sqliteConversionService.getConversionTableNames(), [
    'project_settings',
    'zones',
    'points',
    'phenology_entries',
    'images',
    'taxonomy_candidates'
  ]);
});

test('sqlite conversion service exposes only service-level conversion helpers', () => {
  assert.equal(typeof sqliteConversionService.writeModelToDatabase, 'function');
  assert.equal(typeof sqliteConversionService.readModelFromDatabase, 'function');
  assert.equal(typeof sqliteConversionService.runTemporaryJsonSqliteRoundTrip, 'function');
});
