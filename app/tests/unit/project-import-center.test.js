const fs = require('fs');
const path = require('path');
const Module = require('module');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadModel() {
  const filePath = path.join(process.cwd(), 'src/renderer-modern/features/project/importCenterModel.ts');
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

const { buildProjectImportOptions, describeProjectSource } = loadModel();

test('web import center exposes distinct local source modes', () => {
  const context = {
    runtime: 'web',
    canReadProject: true,
    canImportSqlite: true,
    canImportJson: true,
    canRestoreBackup: true,
    projectLoaded: true
  };
  const original = structuredClone(context);
  const options = buildProjectImportOptions(context);

  assert.deepEqual(context, original);
  assert.deepEqual(
    options.filter(option => option.action === 'open-project').map(option => option.mode),
    ['directory', 'sqlite-file', 'json-files', 'portable-folder']
  );
  assert.equal(options[0].recommended, true);
  assert.equal(options.find(option => option.action === 'restore-backup').disabled, false);
});

test('backup import remains disabled until a target project is loaded', () => {
  const options = buildProjectImportOptions({
    runtime: 'web',
    canReadProject: true,
    canImportSqlite: true,
    canImportJson: true,
    canRestoreBackup: true,
    projectLoaded: false
  });
  const backup = options.find(option => option.action === 'restore-backup');
  assert.equal(backup.disabled, true);
  assert.equal(backup.disabledReasonKey, 'projectImportBackupRequiresProject');
});

test('project source descriptions distinguish immutable SQLite sources', () => {
  assert.deepEqual(describeProjectSource({
    sourceKind: 'sqlite',
    externalSqliteImported: true,
    storageFormat: 'sqlite'
  }), {
    kind: 'sqlite',
    labelKey: 'projectSourceSqlite',
    detailKey: 'projectSourceSqliteDetail',
    warningKey: 'projectSourceSqliteWarning'
  });
  assert.equal(
    describeProjectSource({ sourceKind: 'directory', directoryReconnectRequired: true }).detailKey,
    'projectSourceDirectoryReconnect'
  );
  assert.equal(describeProjectSource({ sourceKind: 'import' }).kind, 'import');
});
