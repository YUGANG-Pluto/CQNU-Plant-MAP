const test = require('node:test');
const assert = require('node:assert/strict');

const queryModule = import('../../src/renderer-modern/features/query/model.ts');

function phenology(overrides = {}) {
  return {
    source: {},
    id: 'entry-1',
    label: '盛花期',
    observer: '调查员 A',
    surveyDate: '2026-04-18',
    habitat: '林缘',
    abundance: '常见',
    growthForm: '乔木',
    floweringState: '盛花期',
    cultivatedStatus: '栽培',
    note: '花期记录',
    images: [],
    ...overrides
  };
}

function point(overrides = {}) {
  return {
    source: { images: [] },
    id: 'point-1',
    pointId: 'P-001',
    zoneRef: 'zone-1',
    lat: 29.6,
    lng: 106.3,
    plantNameCn: '桂花',
    plantNameSci: 'Osmanthus fragrans',
    family: 'Oleaceae',
    genus: 'Osmanthus',
    identificationStatus: 'identified',
    taxonomySource: 'manual',
    taxonomyVerificationStatus: 'manuallyVerified',
    taxonomyCandidatesSummary: [],
    phenologyEntries: [phenology()],
    ...overrides
  };
}

function snapshot() {
  return {
    warnings: [],
    zones: [
      {
        source: {},
        id: 'zone-1',
        zoneId: 'A01',
        name: '中心花园',
        description: '教学楼旁样区',
        geometry: null
      }
    ],
    points: [
      point(),
      point({
        id: 'point-2',
        pointId: 'P-002',
        plantNameCn: '未定植物',
        plantNameSci: '',
        phenologyEntries: [],
        source: { images: ['evidence.jpg'] }
      })
    ]
  };
}

test('typed query searches zones and points without changing source order', async () => {
  const { runProjectQuery } = await queryModule;
  const records = snapshot();
  const pointResults = runProjectQuery(records, { text: '桂花' });
  const zoneResults = runProjectQuery(records, { text: '教学楼' });

  assert.deepEqual(
    pointResults.map(item => [item.type, item.id]),
    [['point', 'point-1']]
  );
  assert.deepEqual(
    zoneResults.map(item => [item.type, item.id]),
    [['zone', 'zone-1']]
  );
  assert.equal(pointResults[0].zoneName, '中心花园');
  assert.equal(pointResults[0].phenologyLabels, '盛花期');
});

test('typed query keeps completeness filters explicit', async () => {
  const { runProjectQuery } = await queryModule;
  const records = snapshot();

  assert.deepEqual(
    runProjectQuery(records, { completeness: 'missingScientificName' }).map(item => item.id),
    ['point-2']
  );
  assert.deepEqual(
    runProjectQuery(records, { completeness: 'missingImage' }).map(item => item.id),
    ['point-1']
  );
  assert.deepEqual(
    runProjectQuery(records, { completeness: 'missingPhenology' }).map(item => item.id),
    ['point-2']
  );
});

test('typed query applies phenology filters to one matching entry', async () => {
  const { runProjectQuery } = await queryModule;
  const records = snapshot();
  const matching = runProjectQuery(records, {
    zoneId: 'zone-1',
    growthForm: '乔木',
    floweringState: '盛花',
    observer: '调查员',
    start: '2026-04-01',
    end: '2026-04-30'
  });
  const outsideRange = runProjectQuery(records, { start: '2026-05-01' });

  assert.deepEqual(
    matching.map(item => item.id),
    ['point-1']
  );
  assert.deepEqual(outsideRange, []);
});

test('typed query returns frozen results and does not mutate project records', async () => {
  const { getPointQueryCompleteness, runProjectQuery } = await queryModule;
  const records = snapshot();
  const before = structuredClone(records);
  const results = runProjectQuery(records, {});
  const completeness = getPointQueryCompleteness(records.points[0]);

  assert.deepEqual(records, before);
  assert.equal(Object.isFrozen(results), true);
  assert.equal(results.every(Object.isFrozen), true);
  assert.equal(Object.isFrozen(completeness), true);
  assert.equal(completeness.missingImage, true);
});
