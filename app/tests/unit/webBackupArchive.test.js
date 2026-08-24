const test = require('node:test');
const assert = require('node:assert/strict');
const { strToU8, zipSync } = require('fflate');

const archiveImportModule = import('../../src/renderer-modern/platform/web/webBackupImport.ts');
const archiveZipModule = import('../../src/renderer-modern/platform/web/webBackupZip.ts');
const capabilityModule = import('../../src/renderer-modern/platform/web/webCapabilities.ts');

function json(value) {
  return strToU8(`${JSON.stringify(value)}\n`);
}

function backupFiles(overrides = {}) {
  const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const manifest = {
    format: 'cqnu-plant-map-web-backup',
    version: 1,
    generatedAt: '2026-08-24T00:00:00.000Z',
    projectId: 'source-project',
    projectLabel: '来源项目',
    backupName: 'backup_source.zip',
    backupLabel: 'manual',
    dataFiles: [
      'information/settings.json',
      'information/zones.json',
      'information/points.json'
    ],
    imageEntries: [{
      reference: '/_cqnu-local-image/source-project/00000000-0000-4000-8000-000000000000/leaf.png',
      archivePath: 'information/images/0001_leaf.png',
      fileName: 'leaf.png',
      mediaType: 'image/png',
      size: image.length
    }],
    missingImageReferences: []
  };
  return {
    'backup-manifest.json': json({ ...manifest, ...(overrides.manifest || {}) }),
    'information/settings.json': json({ language: 'zh', unknownSetting: true }),
    'information/zones.json': json([{ id: 'zone-a', name: '一区', unknownZone: 1 }]),
    'information/points.json': json([{
      id: 'point-a',
      zoneRef: 'zone-a',
      images: [manifest.imageEntries[0].reference],
      unknownPoint: 1
    }]),
    'information/images/0001_leaf.png': image,
    ...(overrides.files || {})
  };
}

function archive(overrides) {
  return zipSync(backupFiles(overrides), { level: 6 });
}

test('web backup ZIP is inspected before restore and preserves unknown project fields', async () => {
  const { inspectWebBackupArchive } = await archiveImportModule;
  const inspected = await inspectWebBackupArchive(archive(), 'portable-backup.zip');

  assert.equal(inspected.manifest.projectLabel, '来源项目');
  assert.equal(inspected.images.length, 1);
  assert.equal(inspected.images[0].mediaType, 'image/png');
  assert.equal(inspected.snapshot.settings.unknownSetting, true);
  assert.equal(inspected.snapshot.zones[0].unknownZone, 1);
  assert.equal(inspected.snapshot.points[0].unknownPoint, 1);
  assert.equal(inspected.snapshot.sourceKind, 'import');
});

test('web backup preflight rejects traversal and unknown archive paths', async () => {
  const { preflightWebBackupArchive } = await archiveZipModule;
  assert.throws(
    () => preflightWebBackupArchive(zipSync({ '../outside.json': json({}) })),
    /不允许的路径/
  );
  assert.throws(
    () => preflightWebBackupArchive(archive({ files: { 'notes.txt': strToU8('unexpected') } })),
    /不允许的路径/
  );
});

test('web backup preflight rejects encrypted flags and bounded expansion', async () => {
  const { preflightWebBackupArchive } = await archiveZipModule;
  const encrypted = archive();
  const view = new DataView(encrypted.buffer, encrypted.byteOffset, encrypted.byteLength);
  for (let offset = 0; offset + 10 < encrypted.length; offset += 1) {
    const signature = view.getUint32(offset, true);
    if (signature === 0x04034b50) view.setUint16(offset + 6, view.getUint16(offset + 6, true) | 1, true);
    if (signature === 0x02014b50) view.setUint16(offset + 8, view.getUint16(offset + 8, true) | 1, true);
  }
  assert.throws(() => preflightWebBackupArchive(encrypted), /不支持加密 ZIP/);
  assert.throws(
    () => preflightWebBackupArchive(archive(), { maxUncompressedBytes: 64 }),
    /解压后总体积超过允许上限/
  );
});

test('web backup inspection rejects incompatible manifests without modifying input bytes', async () => {
  const { inspectWebBackupArchive } = await archiveImportModule;
  const input = archive({ manifest: { version: 99 } });
  const original = new Uint8Array(input);
  await assert.rejects(inspectWebBackupArchive(input, 'future.zip'), /格式或版本不受支持/);
  assert.deepEqual(input, original);
});

test('browser capability assessment distinguishes full, portable, and blocked modes', async () => {
  const { assessWebRuntimeCapabilities } = await capabilityModule;
  const full = {
    webAssembly: true,
    worker: true,
    opfs: true,
    webLocks: true,
    indexedDb: true,
    cacheStorage: true,
    secureRandom: true,
    directoryPicker: true,
    fileSelection: true,
    downloads: true
  };
  assert.equal(assessWebRuntimeCapabilities(full).mode, 'full');
  assert.equal(assessWebRuntimeCapabilities({ ...full, directoryPicker: false }).mode, 'portable');
  const blocked = assessWebRuntimeCapabilities({ ...full, webLocks: false });
  assert.equal(blocked.mode, 'blocked');
  assert.deepEqual(blocked.missingRequired, ['webLocks']);
});
