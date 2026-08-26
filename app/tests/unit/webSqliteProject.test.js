const test = require('node:test');
const assert = require('node:assert/strict');

const sqliteProjectModule = import('../../src/renderer-modern/platform/web/webSqliteProject.ts');

function row(values, presentFields, compatible = {}) {
  return {
    ...values,
    compatJson: JSON.stringify(compatible),
    presentFieldsJson: JSON.stringify(presentFields)
  };
}

test('web SQLite preflight recognizes a bounded SQLite 3 file without mutating bytes', async () => {
  const { assertExternalSqliteFile, hasSqliteHeader } = await sqliteProjectModule;
  const bytes = new Uint8Array(100);
  'SQLite format 3\0'.split('').forEach((character, index) => {
    bytes[index] = character.charCodeAt(0);
  });
  const before = new Uint8Array(bytes);

  assert.equal(hasSqliteHeader(bytes), true);
  assert.doesNotThrow(() => assertExternalSqliteFile({ name: 'data.db', size: bytes.length }, bytes));
  assert.deepEqual(bytes, before);
  assert.throws(
    () => assertExternalSqliteFile({ name: 'data.json', size: bytes.length }, bytes),
    /\.db、\.sqlite/
  );
});

test('desktop SQLite rows restore unknown fields, phenology, and taxonomy candidates', async () => {
  const { deserializeDesktopSqliteTables } = await sqliteProjectModule;
  const source = {
    project_settings: [{ key: 'language', valueJson: '"zh"' }],
    zones: [row({
      internalKey: 'zone:0',
      sourceIndex: 0,
      id: 'zone-a',
      zoneId: 'A',
      name: '一区',
      geometryJson: 'null'
    }, ['id', 'zoneId', 'name', 'geometry'], { customZoneField: 'kept' })],
    points: [row({
      internalKey: 'point:0',
      sourceIndex: 0,
      id: 'point-a',
      pointId: 'P001',
      zoneRef: 'zone-a',
      plantNameSci: 'Osmanthus fragrans',
      family: 'Oleaceae',
      genus: 'Osmanthus',
      imagesJson: '["information/images/a.jpg"]'
    }, [
      'id', 'pointId', 'zoneRef', 'plantNameSci', 'family', 'genus', 'images',
      'phenologyEntries', 'taxonomyCandidatesSummary'
    ], { customPointField: { retained: true } })],
    phenology_entries: [row({
      internalKey: 'phenology:0',
      pointInternalKey: 'point:0',
      sourceIndex: 0,
      id: 'ph-a',
      floweringState: '开花'
    }, ['id', 'floweringState'], { customPhenologyField: 1 })],
    taxonomy_candidates: [row({
      internalKey: 'candidate:0',
      pointInternalKey: 'point:0',
      sourceIndex: 0,
      provider: 'GBIF',
      family: 'Oleaceae',
      genus: 'Osmanthus',
      selected: 1
    }, ['provider', 'family', 'genus', 'selected'], { customCandidateField: 'kept' })]
  };
  const before = structuredClone(source);
  const project = deserializeDesktopSqliteTables(source);

  assert.equal(project.settings.language, 'zh');
  assert.equal(project.zones[0].name, '一区');
  assert.equal(project.zones[0].customZoneField, 'kept');
  assert.deepEqual(project.points[0].customPointField, { retained: true });
  assert.deepEqual(project.points[0].images, ['information/images/a.jpg']);
  assert.equal(project.points[0].phenologyEntries[0].floweringState, '开花');
  assert.equal(project.points[0].phenologyEntries[0].customPhenologyField, 1);
  assert.equal(project.points[0].taxonomyCandidatesSummary[0].provider, 'GBIF');
  assert.equal(project.points[0].taxonomyCandidatesSummary[0].selected, true);
  assert.equal(project.points[0].taxonomyCandidatesSummary[0].customCandidateField, 'kept');
  assert.deepEqual(source, before);
});

test('browser SQLite snapshot selects the stored project document without exposing internals', async () => {
  const { projectDocumentFromExternalSqlite } = await sqliteProjectModule;
  const project = projectDocumentFromExternalSqlite({
    format: 'web-projects',
    bytesRead: 4096,
    quickCheck: 'ok',
    projectCount: 1,
    warnings: [],
    project: {
      projectId: 'web-a',
      label: '浏览器项目',
      modifiedAt: 1000,
      sourceKind: 'opfs',
      settings: { language: 'en' },
      zones: [{ id: 'zone-a', unknownZone: true }],
      points: [{ id: 'point-a', unknownPoint: true }]
    }
  });

  assert.equal(project.settings.language, 'en');
  assert.equal(project.zones[0].unknownZone, true);
  assert.equal(project.points[0].unknownPoint, true);
  assert.equal('projectId' in project, false);
});
