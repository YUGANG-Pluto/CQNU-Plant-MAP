const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sqliteExchangeModel = require('../../src/main/sqliteExchangeModel');

function readFixture(name) {
  const root = path.join(__dirname, '..', 'fixtures', name);
  return {
    settings: JSON.parse(fs.readFileSync(path.join(root, 'settings.json'), 'utf8')),
    zones: JSON.parse(fs.readFileSync(path.join(root, 'zones.json'), 'utf8')),
    points: JSON.parse(fs.readFileSync(path.join(root, 'points.json'), 'utf8'))
  };
}

test('sqlite exchange model round-trips basic JSON project data', () => {
  const project = readFixture('json-project-basic');
  const before = JSON.stringify(project);
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
  const restored = sqliteExchangeModel.buildJsonProjectFromSqliteModel(model);

  assert.equal(JSON.stringify(project), before);
  assert.equal(model.version, sqliteExchangeModel.MODEL_VERSION);
  assert.equal(sqliteExchangeModel.validateSqliteExchangeModel(model).ok, true);
  assert.deepEqual(restored, project);
  assert.equal(model.tables.project_settings.length, 3);
  assert.equal(model.tables.zones[0].id, 'zone-1');
  assert.equal(model.tables.points[0].pointId, 'P-001');
  assert.equal(model.tables.points[0].family, 'Oleaceae');
  assert.equal(model.tables.points[0].genus, 'Osmanthus');
  assert.equal(model.tables.phenology_entries.length, 1);
  assert.equal(model.tables.images.length, 2);
});

test('sqlite exchange model preserves unknown fields with compat payloads', () => {
  const project = readFixture('json-project-unknown-fields');
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
  const restored = sqliteExchangeModel.buildJsonProjectFromSqliteModel(model);

  assert.deepEqual(restored, project);
  assert.deepEqual(JSON.parse(model.tables.zones[0].compatJson), {
    legacyZoneNote: 'keep-zone-extra'
  });
  assert.deepEqual(JSON.parse(model.tables.points[0].compatJson), {
    legacyPointField: { keep: 'point-extra' }
  });
  assert.deepEqual(JSON.parse(model.tables.phenology_entries[0].compatJson), {
    legacyPhenologyField: 'keep-entry-extra'
  });
  assert.deepEqual(JSON.parse(model.tables.taxonomy_candidates[0].compatJson), {
    legacyCandidateField: 'keep-candidate-extra'
  });
});

test('conversion report and backup preflight plan are data-only and path-neutral', () => {
  const project = readFixture('json-project-unknown-fields');
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
  const report = sqliteExchangeModel.buildConversionReport(model, {
    generatedAt: '2026-05-25T00:00:00.000Z'
  });
  const backupPlan = sqliteExchangeModel.buildBackupPreflightPlan({
    generatedAt: '2026-05-25T00:00:00.000Z'
  });

  assert.equal(report.status, 'ready-for-preflight');
  assert.equal(report.counts.points, 1);
  assert.equal(report.counts.imageReferences, 2);
  assert.equal(report.counts.taxonomyCandidates, 1);
  assert.equal(report.compatibility.totalUnknownFieldCount, 4);
  assert.equal(report.privacy.containsAbsolutePaths, false);
  assert.equal(report.safety.writesDatabaseFile, false);
  assert.equal(report.safety.executesBackup, false);
  assert.ok(!/[A-Za-z]:\\/.test(JSON.stringify(report)));

  assert.equal(backupPlan.required, true);
  assert.equal(backupPlan.executeBackup, false);
  assert.equal(backupPlan.writeFiles, false);
  assert.ok(backupPlan.includeRelativePaths.includes('information/points.json'));
  assert.ok(backupPlan.excludePatterns.includes('*.sqlite3'));
  assert.ok(!/[A-Za-z]:\\/.test(JSON.stringify(backupPlan)));
});

test('invalid sqlite exchange model is blocked', () => {
  const invalid = sqliteExchangeModel.validateSqliteExchangeModel({ version: 'old', tables: {} });
  const report = sqliteExchangeModel.buildConversionReport({ version: 'old', tables: {} }, {
    generatedAt: '2026-05-25T00:00:00.000Z'
  });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some(message => message.includes('unsupported model version')));
  assert.equal(report.status, 'blocked');
  assert.ok(report.warnings.length > 0);
});

test('exchange rows remain unique when source records reuse business identifiers', () => {
  const project = {
    settings: {},
    zones: [
      { id: 'duplicate-zone', name: 'Zone A' },
      { id: 'duplicate-zone', name: 'Zone B' }
    ],
    points: [
      {
        id: 'duplicate-point',
        plantNameCn: 'Plant A',
        phenologyEntries: [{ id: 'duplicate-entry', label: 'Flowering' }]
      },
      {
        id: 'duplicate-point',
        plantNameCn: 'Plant B',
        phenologyEntries: [{ id: 'duplicate-entry', label: 'Fruiting' }]
      }
    ]
  };

  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);

  assert.equal(new Set(model.tables.zones.map(row => row.internalKey)).size, 2);
  assert.equal(new Set(model.tables.points.map(row => row.internalKey)).size, 2);
  assert.equal(new Set(model.tables.phenology_entries.map(row => row.internalKey)).size, 2);
  assert.equal(sqliteExchangeModel.validateSqliteExchangeModel(model).ok, true);
  assert.deepEqual(sqliteExchangeModel.buildJsonProjectFromSqliteModel(model), project);
});

test('validation blocks duplicate internal keys and dangling child references', () => {
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject({
    settings: {},
    zones: [],
    points: [
      { id: 'point-a', phenologyEntries: [{ id: 'entry-a' }] },
      { id: 'point-b' }
    ]
  });
  model.tables.points[1].internalKey = model.tables.points[0].internalKey;
  model.tables.phenology_entries[0].pointInternalKey = 'missing-point';

  const validation = sqliteExchangeModel.validateSqliteExchangeModel(model);

  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some(message => message.includes('duplicate internal key in points')));
  assert.ok(validation.errors.some(message => message.includes('invalid point reference')));
});

test('conversion reporting remains stable when a table payload has the wrong shape', () => {
  const malformed = {
    version: sqliteExchangeModel.MODEL_VERSION,
    tables: {
      project_settings: [],
      zones: {},
      points: [],
      phenology_entries: [],
      images: [],
      taxonomy_candidates: []
    }
  };

  const report = sqliteExchangeModel.buildConversionReport(malformed);

  assert.equal(report.status, 'blocked');
  assert.equal(report.counts.zones, 0);
  assert.ok(report.warnings.some(message => message.includes('missing table model: zones')));
});

test('deserialization preserves table arrays and tolerates malformed compatibility JSON', () => {
  const project = readFixture('json-project-basic');
  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject(project);
  model.tables.points.reverse();
  model.tables.phenology_entries.reverse();
  const tableSnapshot = JSON.stringify(model.tables);
  model.tables.zones[0].compatJson = '{invalid';

  const restored = sqliteExchangeModel.buildJsonProjectFromSqliteModel(model);

  assert.equal(restored.zones[0].id, project.zones[0].id);
  assert.equal(JSON.stringify(model.tables).replace('{invalid', '{}'), tableSnapshot.replace('{invalid', '{}'));
});
