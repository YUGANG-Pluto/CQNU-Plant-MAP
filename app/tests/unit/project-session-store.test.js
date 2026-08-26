const fs = require('fs');
const path = require('path');
const Module = require('module');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadSessionStore() {
  const filePath = path.join(process.cwd(), 'src/renderer-modern/features/project/sessionStore.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: filePath
  }).outputText;
  const loaded = new Module(filePath, module);
  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(output, filePath);
  return loaded.exports;
}

const { createProjectSessionStore } = loadSessionStore();

function loadedProject(overrides = {}) {
  return {
    projectDir: 'plant-project',
    settings: {},
    zones: [],
    points: [],
    projectModifiedTime: 100,
    storageFormat: 'sqlite',
    jsonFilesExist: true,
    sqliteDatabaseExists: true,
    webAccessLevel: 'save',
    webDirectoryPermissionStatus: 'granted',
    webProjectSourceKind: 'directory',
    ...overrides
  };
}

test('loaded projects produce an immutable typed session snapshot', () => {
  const store = createProjectSessionStore('web', true);
  const input = loadedProject();
  const copy = structuredClone(input);
  store.setLoadedProject(input);
  const snapshot = store.getSnapshot();

  assert.deepEqual(input, copy);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(snapshot.loaded, true);
  assert.equal(snapshot.sourceKind, 'directory');
  assert.equal(snapshot.storageFormat, 'sqlite');
  assert.equal(snapshot.connection, 'connected');
  assert.equal(snapshot.accessLevel, 'save');
});

test('directory permission loss is represented without discarding the loaded project', () => {
  const store = createProjectSessionStore('web', true);
  store.setLoadedProject(loadedProject());
  store.setDirectoryPermission('denied', true);
  const snapshot = store.getSnapshot();

  assert.equal(snapshot.loaded, true);
  assert.equal(snapshot.directoryReconnectRequired, true);
  assert.equal(snapshot.connection, 'reconnect-required');
});

test('offline and recovery transitions preserve project source and dirty state', () => {
  const store = createProjectSessionStore('web', true);
  store.setLoadedProject(loadedProject({ webProjectSourceKind: 'opfs' }));
  store.setDirty(true);
  store.setOnline(false);
  assert.equal(store.getSnapshot().connection, 'offline');
  assert.equal(store.getSnapshot().dirty, true);
  store.setOnline(true);
  assert.equal(store.getSnapshot().connection, 'connected');
  assert.equal(store.getSnapshot().sourceKind, 'opfs');
});

test('workflow and save transitions expose busy, error, and saved states', () => {
  const store = createProjectSessionStore('electron', true);
  store.setLoadedProject(loadedProject({ webProjectSourceKind: undefined }));
  store.setDirty(true);
  store.applyWorkflowStatus({ sequence: 2, phase: 'saving', operation: 'save', busy: true, errorCode: '' });
  assert.equal(store.getSnapshot().busy, true);
  store.applyWorkflowStatus({ sequence: 2, phase: 'error', operation: null, busy: false, errorCode: 'SAVE_FAILED' });
  assert.equal(store.getSnapshot().errorCode, 'SAVE_FAILED');
  store.setSavedProject({ projectModifiedTime: 300, storageFormat: 'sqlite' });
  assert.equal(store.getSnapshot().dirty, false);
  assert.equal(store.getSnapshot().lastSavedAt, 300);
  assert.equal(store.getSnapshot().connection, 'local');
});

test('subscribers receive revisions and can unsubscribe', () => {
  const store = createProjectSessionStore('web', true);
  const revisions = [];
  const unsubscribe = store.subscribe(snapshot => revisions.push(snapshot.revision));
  store.setDirty(true);
  unsubscribe();
  store.setDirty(false);
  assert.deepEqual(revisions, [0, 1]);
});
