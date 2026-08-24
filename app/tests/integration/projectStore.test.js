const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectStore = require('../../src/main/projectStore');
const pathGuard = require('../../src/main/pathGuard');
const { ERROR_CODES } = require('../../src/main/errorCodes');

function tempProject() {
  const root = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), 'plant-projectstore-test-'))
  );
  const projectDir = path.join(root, 'project');
  fs.mkdirSync(projectDir, { recursive: true });
  pathGuard.trustProjectDirFromDialog(projectDir);
  return { root, projectDir };
}

function expectCode(fn, code) {
  assert.throws(fn, error => error && error.code === code);
}

test('project store creates default JSON project structure', () => {
  const { root, projectDir } = tempProject();
  const loaded = projectStore.loadProject({ projectDir });

  assert.equal(loaded.projectDir, fs.realpathSync.native(projectDir));
  assert.ok(fs.existsSync(path.join(projectDir, 'information', 'settings.json')));
  assert.ok(fs.existsSync(path.join(projectDir, 'information', 'zones.json')));
  assert.ok(fs.existsSync(path.join(projectDir, 'information', 'points.json')));
  assert.ok(Array.isArray(loaded.zones));
  assert.ok(Array.isArray(loaded.points));
  assert.equal(typeof loaded.settings, 'object');

  fs.rmSync(root, { recursive: true, force: true });
});

test('project store loads legacy JSON without normalizing shape', () => {
  const { root, projectDir } = tempProject();
  projectStore.loadProject({ projectDir });
  const legacyPoint = { id: 'p1', coordinates: [106.1, 29.1], unknownField: 'keep' };
  fs.writeFileSync(path.join(projectDir, 'information', 'points.json'), JSON.stringify([legacyPoint], null, 2), 'utf8');

  const loaded = projectStore.loadProject({ projectDir });
  assert.deepEqual(loaded.points, [legacyPoint]);

  fs.rmSync(root, { recursive: true, force: true });
});

test('project store validates save payload shapes and writes JSON atomically', () => {
  const { root, projectDir } = tempProject();

  expectCode(() => projectStore.saveProject(null), ERROR_CODES.INVALID_PAYLOAD);
  expectCode(() => projectStore.saveProject({ projectDir, settings: [], zones: [], points: [] }), ERROR_CODES.INVALID_PAYLOAD);
  expectCode(() => projectStore.saveProject({ projectDir, settings: {}, zones: {}, points: [] }), ERROR_CODES.INVALID_PAYLOAD);
  expectCode(() => projectStore.saveProject({ projectDir, settings: {}, zones: [], points: {} }), ERROR_CODES.INVALID_PAYLOAD);

  const payload = {
    projectDir,
    settings: { language: 'zh', custom: true },
    zones: [{ id: 'z1', name: '一区' }],
    points: [{ id: 'p1', pointId: 'P1', legacy: 'keep' }]
  };
  const saved = projectStore.saveProject(payload);
  assert.equal(saved.projectDir, fs.realpathSync.native(projectDir));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(projectDir, 'information', 'points.json'), 'utf8')), payload.points);
  assert.equal(fs.readdirSync(path.join(projectDir, 'information')).some(name => name.endsWith('.tmp')), false);

  fs.rmSync(root, { recursive: true, force: true });
});
