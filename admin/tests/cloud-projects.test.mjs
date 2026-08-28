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
