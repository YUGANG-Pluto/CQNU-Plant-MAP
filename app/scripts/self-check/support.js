const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const Module = require('module');
const { pathToFileURL } = require('url');

const pathGuard = require('../src/main/pathGuard');
const projectStore = require('../src/main/projectStore');
const fileWrite = require('../src/main/fileWrite');
const logger = require('../src/main/logger');
const maintenanceService = require('../src/main/maintenanceService');
const speciesReferenceService = require('../src/main/speciesReferenceService');
const storageConversionService = require('../src/main/storageConversionService');
const sqliteConversionService = require('../src/main/sqliteConversionService');
const sqliteExchangeModel = require('../src/main/sqliteExchangeModel');
const sqliteSchemaService = require('../src/main/sqliteSchemaService');
const statsResearch = require('../src/renderer/features/stats/statsResearch');
const { ERROR_CODES } = require('../src/main/errorCodes');
const { unwrapIpc } = require('../src/renderer/utils/ipc');
const { errorCode, errorMessage } = require('../src/renderer/utils/errorHandler');
const { formatDateTimeLabel, isoToday, daysBetween } = require('../src/renderer/utils/format');
const { clearNode, el, listTextItem } = require('../src/renderer/utils/dom');
const { EXPORT_COLUMNS_ZH } = require('../src/renderer/state/store');
const {
  mapLegacyPhenology,
  normalizePointRecord,
  decodeCoordPair,
  normalizeZoneRecord
} = require('../src/renderer/data/normalize');

function readWorkspaceDoc(fileName) {
  const candidates = [
    path.join(process.cwd(), 'docs', fileName),
    path.join(process.cwd(), '..', 'docs', fileName)
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  assert.ok(found, `${fileName} must exist in app/docs or repository docs`);
  return fs.readFileSync(found, 'utf8');
}

function readRepositoryReadme() {
  const candidates = [
    path.join(process.cwd(), 'README.md'),
    path.join(process.cwd(), '..', 'README.md')
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  assert.ok(found, 'README.md must exist in app root or repository root');
  return fs.readFileSync(found, 'utf8');
}

function readRepositoryFile(fileName) {
  const candidates = [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), '..', fileName)
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  assert.ok(found, `${fileName} must exist in app root or repository root`);
  return fs.readFileSync(found, 'utf8');
}

function repositoryFileExists(fileName) {
  return [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), '..', fileName)
  ].some(candidate => fs.existsSync(candidate));
}

function readRendererMarkup() {
  const files = [path.join(process.cwd(), 'index.html')];
  const modernRoot = path.join(process.cwd(), 'src', 'renderer-modern');
  const collect = directory => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(entryPath);
      else if (entry.isFile() && entry.name.endsWith('.tsx')) files.push(entryPath);
    });
  };
  collect(modernRoot);
  return files.map(filePath => fs.readFileSync(filePath, 'utf8')).join('\n');
}

function rendererMarkupHasId(source, id) {
  const escapedId = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.includes(`id="${id}"`)
    || source.includes(`id='${id}'`)
    || new RegExp(`\\bid\\s*:\\s*['"]${escapedId}['"]`).test(source);
}

function readAppSources(relativePaths) {
  return relativePaths
    .map(relativePath => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'))
    .join('\n');
}

const PHENOLOGY_RUNTIME_FILES = Object.freeze([
  'src/renderer/features/phenology/draftState.js',
  'src/renderer/features/phenology/taxonomy.js',
  'src/renderer/features/phenology/form.js',
  'src/renderer/features/phenology/actions.js',
  'src/renderer/features/phenology/index.js'
]);

const MAINTENANCE_RUNTIME_FILES = Object.freeze([
  'src/renderer/features/maintenance/core.js',
  'src/renderer/features/maintenance/safeMode.js',
  'src/renderer/features/maintenance/diagnostics.js',
  'src/renderer/features/maintenance/repair.js',
  'src/renderer/features/maintenance/logs.js',
  'src/renderer/features/maintenance/settings.js',
  'src/renderer/features/maintenance/diagnosticsExport.js',
  'src/renderer/features/maintenance/storageView.js',
  'src/renderer/features/maintenance/storageActions.js',
  'src/renderer/features/maintenance/index.js'
]);

const SPECIES_REFERENCE_RUNTIME_FILES = Object.freeze([
  'src/renderer/features/speciesReference/state.js',
  'src/renderer/features/speciesReference/links.js',
  'src/renderer/features/speciesReference/view.js',
  'src/renderer/features/speciesReference/queries.js',
  'src/renderer/features/speciesReference/actions.js',
  'src/renderer/features/speciesReference/index.js'
]);

function readPhenologyRuntimeSource() {
  return readAppSources(PHENOLOGY_RUNTIME_FILES);
}

function readMaintenanceRuntimeSource() {
  return readAppSources(MAINTENANCE_RUNTIME_FILES);
}

function readSpeciesReferenceRuntimeSource() {
  return readAppSources(SPECIES_REFERENCE_RUNTIME_FILES);
}

function readLocaleSource(fileName) {
  const locale = fileName.replace(/\.js$/, '');
  return readAppSources([
    `src/renderer/i18n/${locale}/core.js`,
    `src/renderer/i18n/${locale}/map.js`,
    `src/renderer/i18n/${locale}/species.js`,
    `src/renderer/i18n/${locale}/stats.js`,
    `src/renderer/i18n/${locale}/maintenance.js`,
    `src/renderer/i18n/${fileName}`
  ]);
}

function readRepositoryPath(fileName) {
  const candidates = [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), '..', fileName)
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  assert.ok(found, `${fileName} must exist`);
  return fs.readFileSync(found, 'utf8');
}

const expectedCsvHeader = [
  '\u5206\u533a\u7f16\u53f7',
  '\u5206\u533a\u540d\u79f0',
  '\u70b9\u4f4d\u7f16\u53f7',
  '\u4e2d\u6587\u540d',
  '\u5b66\u540d',
  '\u79d1',
  '\u5c5e',
  '\u9274\u5b9a\u72b6\u6001',
  '\u79d1\u5c5e\u6765\u6e90',
  '\u79d1\u5c5e\u5339\u914d\u540d\u79f0',
  '\u79d1\u5c5e\u5efa\u8bae\u7f6e\u4fe1\u5ea6',
  '\u79d1\u5c5e\u7f6e\u4fe1\u7b49\u7ea7',
  '\u79d1\u5c5e\u6838\u9a8c\u72b6\u6001',
  '\u79d1\u5c5e\u66f4\u65b0\u65f6\u95f4',
  '\u8bb0\u5f55\u8005',
  '\u8c03\u67e5\u65e5\u671f',
  '\u5fae\u751f\u5883',
  '\u591a\u5ea6/\u6570\u91cf',
  '\u751f\u6d3b\u578b',
  '\u7269\u5019\u72b6\u6001',
  '\u6765\u6e90\u5c5e\u6027',
  '\u5907\u6ce8',
  '\u56fe\u7247\u6587\u4ef6',
  '\u7ecf\u5ea6',
  '\u7eac\u5ea6'
];

function expectAppError(fn, code, message) {
  try {
    fn();
  } catch (error) {
    assert.strictEqual(error.code, code, message || code);
    return;
  }
  assert.fail(message || `Expected ${code}`);
}

async function expectAsyncAppError(fn, code, message) {
  try {
    await fn();
  } catch (error) {
    assert.strictEqual(error.code, code, message || code);
    return;
  }
  assert.fail(message || `Expected ${code}`);
}

function requireFresh(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
}

async function withStubbedModules(stubs, fn) {
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return await fn();
  } finally {
    Module._load = originalLoad;
  }
}

function createWorkspace(options = {}) {
  const { trustProject = true } = options;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-self-check-'));
  const projectDir = path.join(root, 'project');
  const imagesDir = path.join(projectDir, 'information', 'images');
  const backupDir = path.join(root, 'backups');

  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  const workspace = {
    root: fs.realpathSync.native(root),
    projectDir: fs.realpathSync.native(projectDir),
    imagesDir: fs.realpathSync.native(imagesDir),
    backupDir: fs.realpathSync.native(backupDir)
  };
  if (trustProject) {
    workspace.projectDir = pathGuard.trustProjectDirFromDialog(workspace.projectDir);
  }
  return workspace;
}
