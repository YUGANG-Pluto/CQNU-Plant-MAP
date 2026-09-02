const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const modelModule = import('../../src/renderer-modern/features/project/cloudProjectLibraryModel.ts');

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
