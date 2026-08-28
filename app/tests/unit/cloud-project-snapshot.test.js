const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function snapshotBuilder() {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/renderer/features/project/cloudSnapshot.js'),
    'utf8'
  );
  const context = { decodeURIComponent };
  vm.runInNewContext(source, context);
  return context.buildCloudProjectSnapshot;
}

test('cloud snapshots remove service credentials and absolute device paths', () => {
  const buildSnapshot = snapshotBuilder();
  const input = {
    settings: {
      baseMaps: [{
        id: 'private-map',
        key: 'secret-key',
        url: 'https://tiles.example.test/{z}/{x}/{y}?key=secret-key'
      }],
      speciesReferenceToken: 'secret-token',
      exportPath: 'D:\\Research\\export.csv'
    },
    zones: [{ id: 'zone-a', name: '一区' }],
    points: [{ id: 'point-a', images: ['images/point-a.jpg'], lat: 29.5, lng: 106.4 }]
  };
  const before = structuredClone(input);
  const snapshot = JSON.parse(JSON.stringify(buildSnapshot(input)));

  assert.equal(snapshot.settings.baseMaps[0].key, '');
  assert.equal(snapshot.settings.baseMaps[0].url, 'https://tiles.example.test/{z}/{x}/{y}?key={key}');
  assert.equal(snapshot.settings.speciesReferenceToken, '');
  assert.equal(snapshot.settings.exportPath, '');
  assert.deepEqual(snapshot.points[0].images, ['images/point-a.jpg']);
  assert.equal(snapshot.points[0].lat, 29.5);
  assert.deepEqual(input, before);
});
