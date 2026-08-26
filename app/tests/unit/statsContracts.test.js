const test = require('node:test');
const assert = require('node:assert/strict');

const contractsModule = import('../../src/renderer-modern/features/stats/contractsRuntime.ts');

function snapshot() {
  return {
    generatedAt: '2026-08-26T00:00:00.000Z',
    exportVersion: 'statistics-v1',
    projectSummary: {
      zoneCount: 1,
      pointCount: 2,
      speciesRichness: 1,
      generatedAt: '2026-08-26T00:00:00.000Z'
    },
    zoneSummaries: [],
    diversityMetrics: { overall: {}, byZone: [], whittakerBeta: null },
    heatmapMatrices: {
      jaccard: {
        id: 'jaccard-zone-matrix',
        title: 'Jaccard',
        metric: 'jaccard',
        valueType: 'similarity',
        range: [0, 1],
        rows: [{ id: 'zone-a', label: '一区' }],
        columns: [{ id: 'zone-a', label: '一区' }],
        cells: [{ rowId: 'zone-a', columnId: 'zone-a', value: 1, displayValue: '1.000', raw: {} }],
        notes: []
      }
    },
    metricDefinitions: [],
    formulaNotes: [],
    dataScopeNotes: []
  };
}

test('typed statistics boundary accepts stable snapshots without cloning or mutation', async () => {
  const { researchStatsSnapshot } = await contractsModule;
  const value = snapshot();
  const before = structuredClone(value);
  assert.equal(researchStatsSnapshot(value), value);
  assert.deepEqual(value, before);
});

test('typed statistics boundary rejects NaN matrix cells', async () => {
  const { researchStatsSnapshot } = await contractsModule;
  const value = snapshot();
  value.heatmapMatrices.jaccard.cells[0].value = Number.NaN;
  assert.throws(() => researchStatsSnapshot(value), /invalid cell/);
});

test('typed statistics export descriptor keeps the stable payload shape', async () => {
  const { statsExportDescriptor } = await contractsModule;
  assert.deepEqual(statsExportDescriptor({
    title: 'Export statistics',
    defaultPath: 'statistics_full_20260826.json',
    content: '{"ok":true}',
    ignored: true
  }), {
    title: 'Export statistics',
    defaultPath: 'statistics_full_20260826.json',
    content: '{"ok":true}'
  });
  assert.throws(() => statsExportDescriptor({ defaultPath: '', content: null }), /file name/);
});
