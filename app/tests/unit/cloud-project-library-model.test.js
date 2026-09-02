const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const modelModule = import('../../src/renderer-modern/features/project/cloudProjectLibraryModel.ts');
const diffModule = import('../../src/renderer-modern/features/project/cloudProjectDiff.ts');
const sourceModule = import('../../src/renderer-modern/platform/web/webCloudProjectSource.ts');

test('cloud project upload inspection matches server serialization and UTF-8 hashing', async () => {
  const { inspectCloudProjectUpload } = await modelModule;
  const source = {
    settings: { projectName: '校园植物' },
    zones: [{ id: 'zone-a', name: '一区' }],
    points: [{ id: 'point-a', zoneId: 'zone-a' }],
    ignored: 'not part of the cloud contract'
  };
  const normalized = {
    formatVersion: 1,
    settings: source.settings,
    zones: source.zones,
    points: source.points
  };
  const serialized = JSON.stringify(normalized);
  const expectedHash = createHash('sha256').update(serialized, 'utf8').digest('hex');
  const inspected = await inspectCloudProjectUpload(source, 32);

  assert.deepEqual(inspected.snapshot, normalized);
  assert.equal(inspected.byteSize, Buffer.byteLength(serialized, 'utf8'));
  assert.equal(inspected.contentSha256, expectedHash);
  assert.equal(inspected.exceedsLimit, true);
  assert.equal(source.ignored, 'not part of the cloud contract');
});

test('cloud project conflicts are identified only from structured error codes', async () => {
  const { cloudProjectErrorCode, isCloudProjectConflict } = await modelModule;
  const conflict = Object.assign(new Error('localized message'), { code: 'CLOUD_PROJECT_CONFLICT' });

  assert.equal(cloudProjectErrorCode(conflict), 'CLOUD_PROJECT_CONFLICT');
  assert.equal(isCloudProjectConflict(conflict), true);
  assert.equal(isCloudProjectConflict(new Error('CLOUD_PROJECT_CONFLICT')), false);
  assert.equal(cloudProjectErrorCode(null), '');
});

test('cloud project upload inspection rejects malformed record arrays without changing them', async () => {
  const { inspectCloudProjectUpload } = await modelModule;
  const source = { settings: {}, zones: [null], points: [] };
  const before = structuredClone(source);

  await assert.rejects(inspectCloudProjectUpload(source, 1024), /记录结构无效/);
  assert.deepEqual(source, before);
});

test('cloud project state refresh reads history only for an expanded project', async () => {
  const { readCloudProjectLibraryState } = await modelModule;
  const calls = [];
  const client = {
    list: async () => { calls.push('list'); return [{ id: 'cloud-a' }]; },
    usage: async () => { calls.push('usage'); return { projectCount: 1 }; },
    revisions: async projectId => { calls.push(`revisions:${projectId}`); return [{ revision: 2 }]; }
  };

  const state = await readCloudProjectLibraryState(client, 'cloud-a');
  assert.deepEqual(calls.sort(), ['list', 'revisions:cloud-a', 'usage']);
  assert.equal(state.projects[0].id, 'cloud-a');
  assert.equal(state.revisions[0].revision, 2);

  calls.length = 0;
  const collapsed = await readCloudProjectLibraryState(client);
  assert.deepEqual(calls.sort(), ['list', 'usage']);
  assert.equal(collapsed.revisions, null);
});

test('cloud project comparison reports settings, zone, and point changes without mutating snapshots', async () => {
  const { compareCloudProjectSnapshots } = await diffModule;
  const local = {
    formatVersion: 1,
    settings: { language: 'zh', mapZoom: 16, localOnly: true },
    zones: [
      { id: 'zone-a', name: '一区' },
      { id: 'zone-local', name: '本地分区' }
    ],
    points: [
      { id: 'point-a', zoneId: 'zone-a', name: '银杏' },
      { id: 'point-local', zoneId: 'zone-local', name: '桂花' }
    ]
  };
  const cloud = {
    formatVersion: 1,
    settings: { language: 'en', mapZoom: 16, cloudOnly: true },
    zones: [
      { id: 'zone-a', name: '一区（云端）' },
      { id: 'zone-cloud', name: '云端分区' }
    ],
    points: [
      { id: 'point-a', zoneId: 'zone-a', name: '银杏' },
      { id: 'point-cloud', zoneId: 'zone-cloud', name: '香樟' }
    ]
  };
  const before = structuredClone({ local, cloud });
  const diff = compareCloudProjectSnapshots(local, cloud);

  assert.deepEqual({ local, cloud }, before);
  assert.deepEqual(
    [diff.settings.added, diff.settings.removed, diff.settings.modified, diff.settings.unchanged],
    [1, 1, 1, 1]
  );
  assert.deepEqual(
    [diff.zones.added, diff.zones.removed, diff.zones.modified, diff.zones.unchanged],
    [1, 1, 1, 0]
  );
  assert.deepEqual(
    [diff.points.added, diff.points.removed, diff.points.modified, diff.points.unchanged],
    [1, 1, 0, 1]
  );
  assert.equal(diff.changed, true);
  assert.equal(diff.changedCount, 8);
});

test('cloud project comparison handles empty snapshots and duplicate record identifiers deterministically', async () => {
  const { compareCloudProjectSnapshots } = await diffModule;
  const empty = compareCloudProjectSnapshots(null, null);
  assert.equal(empty.changed, false);
  assert.equal(empty.changedCount, 0);

  const local = {
    settings: {},
    zones: [{ id: 'zone-a', name: 'A' }, { id: 'zone-a', name: 'A2' }],
    points: []
  };
  const cloud = structuredClone(local);
  cloud.zones[1].name = 'A2 changed';
  const diff = compareCloudProjectSnapshots(local, cloud);
  assert.equal(diff.zones.modified, 1);
  assert.equal(diff.zones.items[0].id, 'zone-a#2');
});

test('cloud source metadata stays beside the browser project document and preserves input records', async () => {
  const { storedWebProjectFromCloud } = await sourceModule;
  const document = {
    metadata: {
      id: 'cloud-a',
      name: '云端调查',
      revision: 7,
      formatVersion: 1,
      byteSize: 120,
      contentSha256: 'abc123',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z'
    },
    snapshot: {
      formatVersion: 1,
      settings: { language: 'zh' },
      zones: [{ id: 'zone-a' }],
      points: [{ id: 'point-a' }]
    }
  };
  const before = structuredClone(document);
  const stored = storedWebProjectFromCloud(document);

  assert.deepEqual(document, before);
  assert.equal(stored.projectId, 'cloud-cloud-a');
  assert.equal(stored.sourceKind, 'cloud');
  assert.equal(stored.cloudSource.projectId, 'cloud-a');
  assert.equal(stored.cloudSource.revision, 7);
  assert.equal(stored.cloudSource.contentSha256, 'abc123');
  assert.equal(Object.hasOwn(stored.settings, 'cloudSource'), false);
  assert.notEqual(stored.settings, document.snapshot.settings);
});

test('cloud source metadata rejects malformed remote identifiers', async () => {
  const { storedWebProjectFromCloud } = await sourceModule;
  assert.throws(() => storedWebProjectFromCloud({
    metadata: { id: '../escape', name: '', revision: 0, formatVersion: 1, byteSize: 0, contentSha256: '', createdAt: '', updatedAt: '' },
    snapshot: null
  }), /云项目标识无效/);
});
