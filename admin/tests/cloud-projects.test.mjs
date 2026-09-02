import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_PROJECT_MAX_BYTES,
  CloudProjectService,
  InMemoryCloudProjectStore
} from '../dist/index.js';

function service() {
  let sequence = 0;
  let now = Date.parse('2026-08-28T08:00:00.000Z');
  return new CloudProjectService(new InMemoryCloudProjectStore(), {
    now: () => new Date(now += 1000),
    randomId: prefix => `${prefix}-test-${++sequence}`
  });
}

test('cloud project snapshots preserve project records and pass integrity verification', async () => {
  const projects = service();
  const created = await projects.create('account-a', 'Campus survey');
  const original = {
    settings: { language: 'zh', unknownSetting: { retained: true } },
    zones: [{ id: 'zone-a', name: '一区', unknownZoneField: 7 }],
    points: [{ id: 'point-a', zoneId: 'zone-a', plantNameCn: '桂花' }]
  };
  const before = structuredClone(original);
  const saved = await projects.save({
    ownerId: 'account-a',
    actorId: 'account-a',
    projectId: created.id,
    expectedRevision: 0,
    snapshot: original
  });
  assert.equal(saved.revision, 1);
  assert.match(saved.contentSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(original, before);
  const loaded = await projects.read('account-a', created.id);
  assert.equal(loaded.snapshot.settings.unknownSetting.retained, true);
  assert.equal(loaded.snapshot.zones[0].unknownZoneField, 7);

  const duplicate = await projects.save({
    ownerId: 'account-a',
    actorId: 'account-a',
    projectId: created.id,
    expectedRevision: saved.revision,
    snapshot: original
  });
  assert.equal(duplicate.revision, saved.revision);
  assert.equal(duplicate.contentSha256, saved.contentSha256);
  assert.deepEqual((await projects.revisions('account-a', created.id)).map(item => item.revision), [1]);
});

test('cloud project writes reject stale revisions and cross-account reads', async () => {
  const projects = service();
  const created = await projects.create('account-a', 'Revision guard');
  const snapshot = { settings: {}, zones: [], points: [] };
  await projects.save({
    ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
    expectedRevision: 0, snapshot
  });
  await assert.rejects(
    projects.save({
      ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
      expectedRevision: 0, snapshot
    }),
    /CLOUD_PROJECT_CONFLICT/
  );
  await assert.rejects(projects.read('account-b', created.id), /CLOUD_PROJECT_NOT_FOUND/);
});

test('restoring an identical historical snapshot still creates an explicit revision', async () => {
  const projects = service();
  const created = await projects.create('account-a', 'Explicit restore');
  const snapshot = { settings: { projectName: 'Same records' }, zones: [], points: [] };
  const saved = await projects.save({
    ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
    expectedRevision: 0, snapshot
  });

  const restored = await projects.restore(
    'account-a', 'account-a', created.id, saved.revision, saved.revision
  );
  assert.equal(restored.revision, 2);
  assert.equal(restored.contentSha256, saved.contentSha256);
  assert.deepEqual(
    (await projects.revisions('account-a', created.id)).map(item => item.revision),
    [2, 1]
  );
});

test('cloud project snapshots enforce the bounded upload size', async () => {
  const projects = service();
  const created = await projects.create('account-a', 'Bounded upload');
  const oversized = 'x'.repeat(CLOUD_PROJECT_MAX_BYTES + 1);
  await assert.rejects(
    projects.save({
      ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
      expectedRevision: 0,
      snapshot: { settings: { oversized }, zones: [], points: [] }
    }),
    /CLOUD_PROJECT_TOO_LARGE/
  );
});

test('cloud project snapshots reject service credentials and absolute device paths', async () => {
  const projects = service();
  const created = await projects.create('account-a', 'Sensitive data guard');
  await assert.rejects(
    projects.save({
      ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
      expectedRevision: 0,
      snapshot: {
        settings: { baseMaps: [{ key: 'secret-key' }] },
        zones: [],
        points: []
      }
    }),
    /CLOUD_PROJECT_SENSITIVE_DATA/
  );
  await assert.rejects(
    projects.save({
      ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
      expectedRevision: 0,
      snapshot: { settings: {}, zones: [], points: [{ notePath: 'D:\\Research\\notes.txt' }] }
    }),
    /CLOUD_PROJECT_SENSITIVE_DATA/
  );
});

test('cloud project lifecycle keeps immutable history and restores into a new revision', async () => {
  const projects = service();
  const created = await projects.create('account-a', 'Versioned survey');
  const firstSnapshot = {
    settings: { projectName: 'First survey' },
    zones: [{ id: 'zone-a', name: '一区' }],
    points: [{ id: 'point-a', zoneId: 'zone-a' }]
  };
  const first = await projects.save({
    ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
    expectedRevision: 0, snapshot: firstSnapshot
  });
  const second = await projects.save({
    ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
    expectedRevision: first.revision,
    snapshot: {
      ...firstSnapshot,
      settings: { projectName: 'Second survey' },
      points: [...firstSnapshot.points, { id: 'point-b', zoneId: 'zone-a' }]
    }
  });

  const history = await projects.revisions('account-a', created.id);
  assert.deepEqual(history.map(item => item.revision), [2, 1]);
  assert.notEqual(history[0].contentSha256, history[1].contentSha256);
  await assert.rejects(projects.revisions('account-b', created.id), /CLOUD_PROJECT_NOT_FOUND/);

  const restored = await projects.restore(
    'account-a', 'account-a', created.id, 1, second.revision
  );
  assert.equal(restored.revision, 3);
  const loaded = await projects.read('account-a', created.id);
  assert.equal(loaded.snapshot.settings.projectName, 'First survey');
  assert.equal(loaded.snapshot.points.length, 1);
  assert.deepEqual(
    (await projects.revisions('account-a', created.id)).map(item => item.revision),
    [3, 2, 1]
  );

  const usage = await projects.usage('account-a');
  assert.equal(usage.projectCount, 1);
  assert.equal(usage.currentBytes, restored.byteSize);
  assert.equal(usage.versionBytes, first.byteSize + second.byteSize + restored.byteSize);
});

test('cloud project rename and deletion enforce ownership and expected revision', async () => {
  const projects = service();
  const created = await projects.create('account-a', 'Lifecycle guard');
  const saved = await projects.save({
    ownerId: 'account-a', actorId: 'account-a', projectId: created.id,
    expectedRevision: 0,
    snapshot: { settings: {}, zones: [], points: [] }
  });
  const renamed = await projects.rename('account-a', created.id, saved.revision, 'Renamed survey');
  assert.equal(renamed.name, 'Renamed survey');
  assert.equal(renamed.revision, saved.revision);
  await assert.rejects(
    projects.rename('account-a', created.id, 0, 'Stale rename'),
    /CLOUD_PROJECT_CONFLICT/
  );
  await assert.rejects(
    projects.delete('account-b', created.id, saved.revision),
    /CLOUD_PROJECT_NOT_FOUND/
  );

  await projects.delete('account-a', created.id, saved.revision);
  assert.deepEqual(await projects.list('account-a'), []);
  assert.equal((await projects.usage('account-a')).versionBytes, 0);
  await assert.rejects(projects.read('account-a', created.id), /CLOUD_PROJECT_NOT_FOUND/);
  await assert.rejects(projects.revisions('account-a', created.id), /CLOUD_PROJECT_NOT_FOUND/);
});
