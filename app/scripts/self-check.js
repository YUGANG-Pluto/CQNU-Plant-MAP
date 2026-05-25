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
  if (trustProject) {
    pathGuard.trustProjectDirFromDialog(projectDir);
  }
  return { root, projectDir, imagesDir, backupDir };
}

function testPathGuard() {
  const { root, projectDir, imagesDir, backupDir } = createWorkspace();
  const diskRoot = path.parse(process.cwd()).root;

  expectAppError(
    () => pathGuard.normalizeProjectDir(diskRoot),
    ERROR_CODES.INVALID_PROJECT_DIR,
    '项目目录不能是磁盘根目录'
  );

  expectAppError(
    () => pathGuard.normalizeProjectDir({ path: projectDir }),
    ERROR_CODES.INVALID_PATH,
    '路径参数必须是字符串'
  );

  expectAppError(
    () => pathGuard.resolveProjectRelative(projectDir, '../escape.json'),
    ERROR_CODES.PATH_OUT_OF_SCOPE,
    '拒绝 ../ 路径逃逸'
  );

  expectAppError(
    () => pathGuard.resolveProjectRelative(projectDir, 'C:escape.json'),
    ERROR_CODES.ABSOLUTE_PATH_REJECTED,
    '拒绝 Windows 驱动器相对路径'
  );

  expectAppError(
    () => pathGuard.resolveProjectRelative(projectDir, 'information/images/safe.jpg:ads'),
    ERROR_CODES.INVALID_PATH,
    '拒绝冒号形式的项目相对路径'
  );

  expectAppError(
    () => pathGuard.resolveProjectRelative(projectDir, path.join(root, 'outside.json')),
    ERROR_CODES.ABSOLUTE_PATH_REJECTED,
    '拒绝绝对路径作为项目相对路径'
  );

  expectAppError(
    () => pathGuard.resolveImageRelative(projectDir, 'information/outside/pic.jpg'),
    ERROR_CODES.PATH_OUT_OF_SCOPE,
    '图片路径必须位于 information/images 内'
  );

  expectAppError(
    () => pathGuard.resolveImageRelative(projectDir, 'information/images/pic.exe'),
    ERROR_CODES.INVALID_FILE_TYPE,
    '图片扩展名必须使用白名单'
  );

  const untrusted = createWorkspace({ trustProject: false });
  expectAppError(
    () => projectStore.loadProject({ projectDir: untrusted.projectDir }),
    ERROR_CODES.UNTRUSTED_PROJECT_DIR,
    '项目目录必须先由系统目录选择器授信'
  );
  pathGuard.trustProjectDirFromDialog(untrusted.projectDir);
  assert.strictEqual(projectStore.loadProject({ projectDir: untrusted.projectDir }).projectDir, untrusted.projectDir);
  fs.rmSync(untrusted.root, { recursive: true, force: true });

  expectAppError(
    () => pathGuard.normalizeBackupDir(projectDir, backupDir),
    ERROR_CODES.UNTRUSTED_BACKUP_DIR,
    '未信任备份目录不可用于手动备份'
  );

  assert.strictEqual(
    pathGuard.normalizeBackupDir(projectDir),
    path.join(root, 'project_backups'),
    '默认备份目录必须位于项目同级目录'
  );

  expectAppError(
    () => pathGuard.normalizeBackupDir(projectDir, false),
    ERROR_CODES.INVALID_PATH,
    '备份目录参数必须是字符串'
  );

  const insideBackupDir = path.join(projectDir, 'backups');
  fs.mkdirSync(insideBackupDir, { recursive: true });
  const trustedInsideBackupDir = pathGuard.trustBackupDirFromDialog(insideBackupDir);
  expectAppError(
    () => pathGuard.normalizeBackupDir(projectDir, trustedInsideBackupDir),
    ERROR_CODES.INVALID_PATH,
    '备份目录不能位于项目目录内'
  );

  const trustedBackupDir = pathGuard.trustBackupDirFromDialog(backupDir);
  const textBackup = path.join(trustedBackupDir, 'backup.txt');
  fs.writeFileSync(textBackup, 'not zip');

  expectAppError(
    () => pathGuard.resolveBackupFile(projectDir, trustedBackupDir, textBackup),
    ERROR_CODES.INVALID_BACKUP_FILE,
    '备份清理对象必须是 .zip'
  );

  const imageFile = path.join(imagesDir, 'safe.jpg');
  fs.writeFileSync(imageFile, 'image');
  assert.strictEqual(
    pathGuard.resolveImageRelative(projectDir, 'information/images/safe.jpg'),
    imageFile
  );

  fs.rmSync(root, { recursive: true, force: true });
}

function testNormalize() {
  assert.strictEqual(mapLegacyPhenology('开花'), '盛花期');
  assert.strictEqual(mapLegacyPhenology('结果'), '果熟期');
  assert.strictEqual(mapLegacyPhenology('营养期'), '营养生长期');
  assert.strictEqual(mapLegacyPhenology('落花'), '凋花期');
  assert.strictEqual(mapLegacyPhenology('花蕾'), '现蕾期');
  assert.strictEqual(mapLegacyPhenology('幼果'), '幼果期');
  assert.strictEqual(mapLegacyPhenology('成熟'), '果熟期');

  const point = normalizePointRecord({
    pointId: 'P001',
    lat: '29.1',
    lng: '106.1',
    floweringState: '开花',
    observer: 'A',
    images: 'a.jpg;b.jpg'
  });

  assert.strictEqual(point.phenologyEntries.length, 1);
  assert.strictEqual(point.phenologyEntries[0].floweringState, '盛花期');
  assert.strictEqual(point.floweringState, '盛花期');
  assert.deepStrictEqual(point.images, ['a.jpg', 'b.jpg']);
  assert.ok(!Object.prototype.hasOwnProperty.call(point, 'schemaVersion'));
  assert.strictEqual(point.family, '');
  assert.strictEqual(point.genus, '');
  assert.strictEqual(point.taxonomyVerificationStatus, 'unverified');

  assert.deepStrictEqual(decodeCoordPair([106.3, 29.6]), [29.6, 106.3]);
  assert.deepStrictEqual(decodeCoordPair([29.6, 106.3]), [29.6, 106.3]);
  assert.deepStrictEqual(decodeCoordPair({ latitude: 29.6, longitude: 106.3 }), [29.6, 106.3]);
  assert.deepStrictEqual(decodeCoordPair({ x: 106.3, y: 29.6 }), [29.6, 106.3]);

  const zone = normalizeZoneRecord({ latlngs: [{ lat: 29.6, lng: 106.3 }, [106.31, 29.61], [106.32, 29.62]] });
  assert.strictEqual(zone.geometry.type, 'Polygon');
  assert.deepStrictEqual(zone.geometry.coordinates[0][0], [106.3, 29.6]);
}

function testExportContracts() {
  const header = EXPORT_COLUMNS_ZH.map(([, label]) => label);
  assert.deepStrictEqual(header, expectedCsvHeader, 'CSV 中文表头顺序必须保持不变');

  const dataFileNames = ['settings.json', 'zones.json', 'points.json'];
  dataFileNames.forEach(name => assert.ok(!name.includes('schema')));
}

function testRendererIpcContract() {
  assert.deepStrictEqual(unwrapIpc({ ok: true, data: { value: 1 } }), { value: 1 });
  expectAppError(
    () => unwrapIpc({ ok: false, error: { code: ERROR_CODES.INVALID_PAYLOAD, message: 'bad' } }),
    ERROR_CODES.INVALID_PAYLOAD
  );
  assert.strictEqual(errorCode({ code: 'X' }), 'X');
  assert.strictEqual(errorMessage({ message: 'hello' }), 'hello');
}

function testRendererUtilityContracts() {
  assert.strictEqual(formatDateTimeLabel('bad-date'), 'bad-date');
  assert.match(isoToday(), /^\d{4}-\d{2}-\d{2}$/);
  assert.strictEqual(daysBetween(new Date().toISOString(), 1), true);
  assert.strictEqual(typeof clearNode, 'function');
  assert.strictEqual(typeof el, 'function');
  assert.strictEqual(typeof listTextItem, 'function');
}

function testProjectStoreWritesJson() {
  const { root, projectDir } = createWorkspace();

  const result = projectStore.saveProject({
    projectDir,
    settings: { locale: 'zh-CN', theme: 'dark' },
    zones: [{ zoneId: 'Z001', name: 'A' }],
    points: [{ pointId: 'P001', lat: 29.1, lng: 106.1 }]
  });
  const infoDir = path.join(result.projectDir, 'information');

  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(infoDir, 'settings.json'), 'utf8')), {
    locale: 'zh-CN',
    theme: 'dark'
  });
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(infoDir, 'zones.json'), 'utf8')).length, 1);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(infoDir, 'points.json'), 'utf8')).length, 1);
  assert.deepStrictEqual(
    fs.readdirSync(infoDir).filter(name => name.endsWith('.tmp')),
    []
  );

  fs.rmSync(root, { recursive: true, force: true });
}

function testProjectStoreRejectsInvalidSavePayloads() {
  const { root, projectDir } = createWorkspace();

  try {
    expectAppError(
      () => projectStore.saveProject({
        projectDir,
        settings: [],
        zones: [],
        points: []
      }),
      ERROR_CODES.INVALID_PAYLOAD
    );

    expectAppError(
      () => projectStore.saveProject({
        projectDir,
        settings: {},
        zones: '',
        points: []
      }),
      ERROR_CODES.INVALID_PAYLOAD
    );

    expectAppError(
      () => projectStore.saveProject({
        projectDir,
        settings: {},
        zones: [],
        points: 0
      }),
      ERROR_CODES.INVALID_PAYLOAD
    );

    const infoDir = path.join(projectDir, 'information');
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(infoDir, 'zones.json'), 'utf8')), []);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(infoDir, 'points.json'), 'utf8')), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testAtomicTextWrite() {
  const { root } = createWorkspace();
  const target = path.join(root, 'export.csv');

  try {
    fileWrite.writeTextFileAtomic(target, 'a,b\n1,2');
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'a,b\n1,2');
    assert.deepStrictEqual(
      fs.readdirSync(root).filter(name => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testExportWritesAtomicallyAndValidatesContent() {
  const { root } = createWorkspace();
  const exportPath = path.join(root, 'records.csv');
  const electronStub = {
    dialog: {
      showSaveDialog: async () => ({ canceled: false, filePath: exportPath })
    }
  };

  try {
    await withStubbedModules({ electron: electronStub }, async () => {
      const dialogService = requireFresh('../src/main/dialogService');
      const result = await dialogService.exportCsv({ content: 'a,b\n1,2' });
      assert.strictEqual(result.filePath, exportPath);
      assert.strictEqual(fs.readFileSync(exportPath, 'utf8'), 'a,b\n1,2');
      assert.deepStrictEqual(
        fs.readdirSync(root).filter(name => name.endsWith('.tmp')),
        []
      );

      await expectAsyncAppError(
        () => dialogService.exportCsv({ content: false }),
        ERROR_CODES.INVALID_PAYLOAD
      );
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testImageImportDoesNotOverwriteExistingArchive() {
  const { root, projectDir } = createWorkspace();
  const sourcePath = path.join(root, 'source.jpg');
  fs.writeFileSync(sourcePath, 'image');
  projectStore.ensureProjectStructure(projectDir);
  const electronStub = {
    dialog: {
      showOpenDialog: async () => ({ canceled: false, filePaths: [sourcePath] })
    }
  };
  const exifrStub = { parse: async () => ({}) };
  const realNow = Date.now;
  const realRandom = Math.random;
  const randomValues = [0.1, 0.1, 0.2];

  try {
    Date.now = () => 1700000000000;
    Math.random = () => randomValues.shift() || 0.3;

    await withStubbedModules({ electron: electronStub, exifr: exifrStub }, async () => {
      const imageService = requireFresh('../src/main/imageService');
      const first = await imageService.importImage({ projectDir });
      const second = await imageService.importImage({ projectDir });

      assert.notStrictEqual(first.relativePath, second.relativePath);
      assert.ok(fs.existsSync(first.absolutePath));
      assert.ok(fs.existsSync(second.absolutePath));
      assert.strictEqual(fs.readFileSync(first.absolutePath, 'utf8'), 'image');
      assert.strictEqual(fs.readFileSync(second.absolutePath, 'utf8'), 'image');
    });
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function createAdmZipStub({ failWrite = false } = {}) {
  return class AdmZipStub {
    addLocalFolder(projectRoot, projectName) {
      this.projectRoot = projectRoot;
      this.projectName = projectName;
    }

    writeZip(targetPath) {
      fs.writeFileSync(targetPath, `${this.projectName}:${this.projectRoot}`);
      if (failWrite) {
        throw new Error('zip failed');
      }
    }
  };
}

async function testBackupCreateCleanupAndCounts() {
  const { root, projectDir, backupDir } = createWorkspace();
  const trustedBackupDir = pathGuard.trustBackupDirFromDialog(backupDir);
  const realDate = Date;
  const fixedTime = new Date('2026-01-02T03:04:05Z');

  try {
    global.Date = class FixedDate extends realDate {
      constructor(...args) {
        return args.length ? new realDate(...args) : new realDate(fixedTime);
      }

      static now() {
        return fixedTime.getTime();
      }
    };

    await withStubbedModules({ 'adm-zip': createAdmZipStub() }, async () => {
      const backupService = requireFresh('../src/main/backupService');
      const first = backupService.create({
        projectDir,
        backupDir: trustedBackupDir,
        label: 'manual'
      });
      const second = backupService.create({
        projectDir,
        backupDir: trustedBackupDir,
        label: 'manual'
      });

      assert.notStrictEqual(first.filePath, second.filePath);
      assert.ok(fs.existsSync(first.filePath));
      assert.ok(fs.existsSync(second.filePath));
      assert.deepStrictEqual(
        fs.readdirSync(backupDir).filter(name => name.endsWith('.tmp')),
        []
      );

      const missingZip = path.join(backupDir, 'missing.zip');
      assert.strictEqual(
        backupService.keepExpired({
          projectDir,
          backupDir: trustedBackupDir,
          paths: [first.filePath, missingZip]
        }).updated,
        1
      );
      assert.strictEqual(
        backupService.deleteExpired({
          projectDir,
          backupDir: trustedBackupDir,
          paths: [first.filePath, missingZip]
        }).deleted,
        1
      );

      expectAppError(
        () => backupService.listExpired({
          projectDir,
          backupDir: trustedBackupDir,
          days: 'invalid'
        }),
        ERROR_CODES.INVALID_PAYLOAD
      );
    });

    await withStubbedModules({ 'adm-zip': createAdmZipStub({ failWrite: true }) }, async () => {
      const backupService = requireFresh('../src/main/backupService');
      assert.throws(() => backupService.create({
        projectDir,
        backupDir: trustedBackupDir,
        label: 'fail'
      }));
      assert.deepStrictEqual(
        fs.readdirSync(backupDir).filter(name => name.includes('fail')),
        []
      );
      assert.deepStrictEqual(
        fs.readdirSync(backupDir).filter(name => name.endsWith('.tmp')),
        []
      );
    });
  } finally {
    global.Date = realDate;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testIpcDoesNotMaskFalsePayload() {
  const handlers = {};
  const appIndexUrl = pathToFileURL(path.join(process.cwd(), 'index.html')).toString();
  const trustedEvent = {
    sender: {
      userAgent: 'self-check',
      getURL: () => appIndexUrl
    },
    senderFrame: { url: appIndexUrl }
  };
  const electronStub = {
    BrowserWindow: {
      fromWebContents: () => null
    },
    shell: {
      openExternal: async () => {}
    },
    ipcMain: {
      handle: (channel, fn) => {
        handlers[channel] = fn;
      }
    }
  };

  await withStubbedModules({
    electron: electronStub,
    'adm-zip': createAdmZipStub()
  }, async () => {
    const ipcRegister = requireFresh('../src/main/ipcRegister');
    ipcRegister.registerIpc();
    const originalError = console.error;

    try {
      console.error = () => {};
      const rejectedSender = await handlers['project:save'](
        { sender: { getURL: () => 'https://example.invalid/' }, senderFrame: { url: 'https://example.invalid/' } },
        false
      );
      assert.strictEqual(rejectedSender.ok, false);
      assert.strictEqual(rejectedSender.error.code, ERROR_CODES.UNTRUSTED_IPC_SENDER);

      const response = await handlers['project:save'](trustedEvent, false);
      assert.strictEqual(response.ok, false);
      assert.strictEqual(response.error.code, ERROR_CODES.INVALID_PAYLOAD);
      const logResponse = await handlers['log:renderer'](
        trustedEvent,
        { level: 'warn', scope: 'renderer:self-check', message: 'warn' }
      );
      assert.strictEqual(logResponse.ok, true);
      assert.strictEqual(logResponse.data.logged, true);
      const levelResponse = await handlers['log:setLevel'](trustedEvent, { level: 'error' });
      assert.strictEqual(levelResponse.ok, true);
      assert.strictEqual(levelResponse.data.level, 'error');
      const externalResponse = await handlers['window:openExternal'](trustedEvent, { url: 'https://www.gbif.org/' });
      assert.strictEqual(externalResponse.ok, true);
      const invalidExternalResponse = await handlers['window:openExternal'](trustedEvent, { url: 'file:///tmp/test' });
      assert.strictEqual(invalidExternalResponse.ok, false);
      assert.strictEqual(invalidExternalResponse.error.code, ERROR_CODES.INVALID_EXTERNAL_URL);
      [
        'settings:importJson',
        'settings:exportJson',
        'log:listRecent',
        'log:cleanup',
        'log:exportDiagnostics',
        'maintenance:checkImageRefs'
      ].forEach(channel => assert.strictEqual(typeof handlers[channel], 'function', `${channel} must be registered`));
      const recentResponse = await handlers['log:listRecent'](trustedEvent, { limit: 10 });
      assert.strictEqual(recentResponse.ok, true);
      const cleanupResponse = await handlers['log:cleanup'](trustedEvent, {});
      assert.strictEqual(cleanupResponse.ok, true);
      const { root, projectDir, imagesDir } = createWorkspace();
      try {
        fs.writeFileSync(path.join(imagesDir, 'safe.png'), 'image');
        const imageResponse = await handlers['maintenance:checkImageRefs'](trustedEvent, {
          projectDir,
          refs: ['information/images/safe.png']
        });
        assert.strictEqual(imageResponse.ok, true);
        assert.strictEqual(imageResponse.data.items[0].exists, true);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    } finally {
      console.error = originalError;
    }
  });
}

function testLoggerWritesAndCleansUp() {
  const { root } = createWorkspace();
  const logDir = path.join(root, 'logs');

  try {
    logger.configureLogger({
      logDir,
      level: 'info',
      retentionDays: 1,
      maxFileBytes: 1024 * 1024
    });
    logger.writeLog('debug', 'self-check:hidden', 'hidden');
    logger.writeLog('info', 'self-check:info', 'visible', {
      projectDir: path.join(root, 'project'),
      content: 'secret'
    });
    logger.logError('self-check:error', Object.assign(new Error('boom'), { code: 'BOOM' }));
    logger.reportRendererLog({
      level: 'error',
      scope: 'renderer:test',
      code: 'RUNTIME',
      message: 'renderer failed',
      details: { path: path.join(root, 'project', 'points.json') }
    });

    const files = fs.readdirSync(logDir).filter(name => name.endsWith('.log'));
    assert.strictEqual(files.length, 1);
    const text = fs.readFileSync(path.join(logDir, files[0]), 'utf8');
    assert.ok(text.includes('self-check:info'));
    assert.ok(text.includes('self-check:error'));
    assert.ok(text.includes('renderer:test'));
    assert.ok(!text.includes('hidden'));
    assert.ok(!text.includes('secret'));
    const recent = logger.listRecentLogs({ limit: 10 });
    assert.ok(Array.isArray(recent.files));
    assert.ok(recent.entries.some(entry => entry.scope === 'renderer:test'));
    assert.strictEqual(recent.config.level, 'info');

    const oldLog = path.join(logDir, 'app-2000-01-01.log');
    fs.writeFileSync(oldLog, 'old');
    fs.utimesSync(oldLog, new Date('2000-01-01'), new Date('2000-01-01'));
    const cleanup = logger.cleanupOldLogs();
    assert.ok(cleanup.deleted >= 1);
    assert.ok(!fs.existsSync(oldLog));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testMaintenanceServiceImageRefGuard() {
  const { root, projectDir, imagesDir } = createWorkspace();
  try {
    fs.writeFileSync(path.join(imagesDir, 'safe.png'), 'image');
    const result = maintenanceService.checkImageRefs({
      projectDir,
      refs: [
        'information/images/safe.png',
        'information/images/missing.png',
        '../escape.png'
      ]
    });
    assert.strictEqual(result.checked, 3);
    assert.strictEqual(result.items.find(item => item.ref === 'information/images/safe.png').exists, true);
    assert.strictEqual(result.items.find(item => item.ref === 'information/images/missing.png').exists, false);
    assert.strictEqual(result.items.find(item => item.ref === '../escape.png').exists, false);
    expectAppError(
      () => maintenanceService.checkImageRefs({
        projectDir,
        refs: new Array(5001).fill('information/images/safe.png')
      }),
      ERROR_CODES.INVALID_PAYLOAD
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testHtmlErrorDialogWiring() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  assert.ok(html.includes('id="alertModal"'));
  assert.ok(html.includes('id="btnAlertClose"'));
  assert.ok(html.includes('./src/renderer/utils/format.js'));
  assert.ok(html.includes('./src/renderer/utils/dom.js'));
  assert.ok(html.includes('./src/renderer/utils/errorHandler.js'));
  assert.ok(html.indexOf('./src/renderer/utils/dialogs.js') < html.indexOf('./src/renderer/utils/errorHandler.js'));
}

function testEngineeringSplitContract() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  assert.ok(html.indexOf('./src/renderer/features/theme/config.js') < html.indexOf('./src/renderer/features/theme/index.js'));

  const styleDir = path.join(process.cwd(), 'src/renderer/styles');
  const appCss = fs.readFileSync(path.join(styleDir, 'app.css'), 'utf8');
  [
    '00-tokens-base.css',
    '10-core-components.css',
    '20-theme-layouts.css',
    '30-glass-motion-progress.css',
    '40-workspace-basemap.css',
    '50-overlay-inspector.css',
    '60-refined-workbench.css',
    '70-vibeui-design-md.css'
  ].forEach(name => {
    assert.ok(appCss.includes(`./${name}`), `${name} must be imported by app.css`);
    assert.ok(fs.existsSync(path.join(styleDir, name)), `${name} must exist`);
  });

  const themeConfig = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/theme/config.js'), 'utf8');
  const themeIndex = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/theme/index.js'), 'utf8');
  assert.ok(themeConfig.includes('const UI_STYLE_PRESETS'));
  assert.ok(themeConfig.includes('const THEME_LAYOUT_CLASSES'));
  assert.ok(themeConfig.includes("'field-notebook'"));
  assert.ok(themeConfig.includes("const DEFAULT_UI_STYLE_ID = 'field-notebook'"));
  const presetBlock = themeConfig.split('const THEME_COLOR_SLOTS')[0];
  const styleIds = [...presetBlock.matchAll(/^  '([^']+)': \{/gm)].map(match => match[1]);
  assert.strictEqual(styleIds.length, 6);
  assert.deepStrictEqual(styleIds.sort(), [
    'botanical-scientific',
    'deep-slate',
    'field-notebook',
    'flow-data',
    'linear-minimal',
    'scientific-white'
  ].sort());
  Object.entries({
    'cloud-soft': 'field-notebook',
    'lavender-soft': 'flow-data',
    'nordic-minimal': 'linear-minimal',
    'deep-indigo': 'deep-slate',
    'dimensional-chart': 'flow-data',
    'soft-dashboard': 'field-notebook',
    'glass-blue': 'field-notebook',
    'academic-light': 'scientific-white',
    'pastel-data': 'flow-data',
    'minimal-white': 'linear-minimal'
  }).forEach(([legacyId, activeId]) => {
    assert.ok(themeConfig.includes(`'${legacyId}': '${activeId}'`), `${legacyId} must map to ${activeId}`);
  });
  assert.ok(themeConfig.includes("standard: 'light'"));
  assert.ok(themeConfig.includes("dark: 'liquid'"));
  const htmlGlassOptions = [...html.matchAll(/<option value="([^"]+)" data-i18n="themeGlassMode/g)].map(match => match[1]);
  assert.deepStrictEqual(htmlGlassOptions, ['off', 'light', 'liquid']);
  assert.ok(!themeIndex.includes('const UI_STYLE_PRESETS'));
  assert.ok(themeIndex.includes('const THEME_DEFAULTS'));
}

function testVibeUiDesignMdLayer() {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/70-vibeui-design-md.css'), 'utf8');
  const doc = readWorkspaceDoc('vibeui-design-md-adaptation.md');
  assert.ok(source.includes('VibeUI design-md adaptation'));
  assert.ok(source.includes('--vibe-ease-standard'));
  assert.ok(source.includes('.motion-disabled .vibe-motion-surface'));
  [
    'theme-field-notebook',
    'theme-scientific-white',
    'theme-botanical-scientific',
    'theme-linear-minimal',
    'theme-deep-slate',
    'theme-flow-data'
  ].forEach(className => assert.ok(source.includes(className), `${className} needs a VibeUI grammar rule`));
  assert.ok(doc.includes('https://vibeui.top/'));
  assert.ok(doc.includes('https://github.com/VoltAgent/awesome-design-md'));
}

function testVibeMotionContract() {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/70-vibeui-design-md.css'), 'utf8');
  const chartSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/charts.js'), 'utf8');
  [
    '@keyframes vibePanelEnter',
    '@keyframes vibeDetailReveal',
    '@keyframes vibeChartReveal',
    '@keyframes vibeChartItemRise',
    '@keyframes vibeDonutSliceReveal',
    '@keyframes vibeStatusPulse'
  ].forEach(keyframe => assert.ok(source.includes(keyframe), `${keyframe} must stay available`));
  [
    '.motion-theme :where(',
    '.motion-layout :where(',
    '.motion-modal .theme-advanced-panel[open]',
    '.motion-mode-rich .chart-bar-group',
    '.motion-mode-rich .donut-slice',
    '.motion-mode-rich .progress-card.running .progress-status-icon',
    '.motion-disabled :where('
  ].forEach(selector => assert.ok(source.includes(selector), `${selector} must stay wired`));
  assert.ok(source.includes('--vibe-chart-slice-stagger'), 'donut slice stagger must stay bounded');
  assert.ok(source.includes('.motion-hover #statsModal :where(.chart-card, .stats-control-card):hover'), 'stats chart cards must not lift while reading charts');
  assert.ok(!source.includes('.motion-mode-rich .donut-svg {\n  animation:'), 'donut svg should not animate on top of the stage and slices');
  assert.ok(chartSource.includes('--chart-index'));
  assert.ok(chartSource.includes('--slice-index'));
  assert.ok(chartSource.includes('--legend-index'));
}

function testCssStructureGuards() {
  const styleDir = path.join(process.cwd(), 'src/renderer/styles');
  fs.readdirSync(styleDir)
    .filter(name => name.endsWith('.css'))
    .forEach(name => {
      const source = fs.readFileSync(path.join(styleDir, name), 'utf8');
      const open = (source.match(/\{/g) || []).length;
      const close = (source.match(/\}/g) || []).length;
      assert.strictEqual(open, close, `${name} has unbalanced CSS braces`);
      assert.ok(!/,\s*\}/.test(source), `${name} has a dangling selector before a closing brace`);
    });
}

function testLegacyThemeCssRemoved() {
  const styleDir = path.join(process.cwd(), 'src/renderer/styles');
  const legacyThemeIds = [
    'cloud-soft',
    'lavender-soft',
    'nordic-minimal',
    'deep-indigo',
    'dimensional-chart'
  ];
  const forbiddenSelectors = legacyThemeIds.flatMap(id => [
    `theme-${id}`,
    `data-ui-style="${id}"`
  ]);

  fs.readdirSync(styleDir)
    .filter(name => name.endsWith('.css'))
    .forEach(name => {
      const source = fs.readFileSync(path.join(styleDir, name), 'utf8');
      forbiddenSelectors.forEach(selector => {
        assert.ok(!source.includes(selector), `${name} must not retain legacy theme selector ${selector}`);
      });
    });
}

function testThemeSettingsProgressiveDisclosure() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');
  const themeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/theme/index.js'), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.strictEqual(ids.length, new Set(ids).size, 'HTML ids must stay unique after settings regrouping');
  assert.ok((html.match(/class="theme-advanced-panel/g) || []).length >= 4);
  [
    'themeColorTuningHint',
    'themeAdvancedColorSummary',
    'themeAdvancedTextureSummary',
    'themeAdvancedGlassSummary',
    'themeAdvancedMotionSummary'
  ].forEach(key => assert.ok(html.includes(`data-i18n="${key}"`), `${key} must be wired in theme settings`));
  [
    'themeTokenTabs',
    'themeGlassEffectOpacity',
    'themeGlassEffectBlur',
    'themeRadius',
    'themeShadowStrength',
    'themeGlassApplyCharts',
    'motionSpeedMultiplier',
    'motionReduced',
    'statusColorSuccess'
  ].forEach(id => assert.ok(html.includes(`id="${id}"`), `${id} must remain present`));
  [
    'themeAlpha',
    'themeGlassOpacity',
    'themeGlassBlur',
    'themeContrast',
    'brandIconStyle',
    'brandIconDisplay',
    'brandIconHue',
    'brandIconSaturation',
    'brandIconLightness',
    'btnResetBrandIcon'
  ].forEach(id => {
    assert.ok(!html.includes(`id="${id}"`), `${id} should not remain as a visible UI control`);
    assert.ok(!elementsSource.includes(`'${id}'`), `${id} should not remain in the DOM registry`);
  });
  [
    'glassOpacity: clamp',
    'glassBlur: clamp',
    'contrast: clamp'
  ].forEach(fragment => assert.ok(themeSource.includes(fragment), `${fragment} must stay normalized for compatibility`));
  const motionAdvancedIndex = html.indexOf('themeAdvancedMotionSummary');
  assert.ok(motionAdvancedIndex > -1, 'advanced motion section must remain present');
  ['progressHeight', 'progressShowPercent', 'progressShowStage', 'progressGlass'].forEach(id => {
    const idIndex = html.indexOf(`id="${id}"`);
    assert.ok(idIndex > motionAdvancedIndex, `${id} should stay inside the advanced motion/progress section`);
  });

  ['zh.js', 'en.js'].forEach(name => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/renderer/i18n', name), 'utf8');
    [
      'themeColorTuningHint',
      'themeAdvancedColorSummary',
      'themeTextureHint',
      'themeAdvancedTextureSummary',
      'themeAdvancedGlassSummary',
      'themeAdvancedMotionSummary'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testBrandLogoResource() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const themeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/theme/index.js'), 'utf8');
  const brandDir = path.join(process.cwd(), 'src/renderer/assets/brand');
  const logoPath = path.join(brandDir, 'cqnu-logo.svg');
  assert.ok(fs.existsSync(logoPath), 'faithful CQNU SVG logo must exist');
  assert.ok(html.includes('./src/renderer/assets/brand/cqnu-logo.svg'), 'runtime HTML must use the faithful CQNU SVG logo');
  [
    'app-logo-full.svg',
    'app-logo-mark.svg',
    'source-logo.png',
    'title-logo.png'
  ].forEach(name => {
    assert.ok(!fs.existsSync(path.join(brandDir, name)), `legacy brand asset ${name} must be removed`);
    assert.ok(!html.includes(name), `HTML must not reference legacy brand asset ${name}`);
  });
  assert.ok(!html.includes('brand-logo-full-symbol'), 'HTML must not retain the simplified inline logo symbol');
  assert.ok(themeSource.includes('normalizeBrandIconSettings'), 'brand settings normalization must stay for old settings.json compatibility');
}

function testStatisticsChartVisualContract() {
  const statsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/index.js'), 'utf8');
  const statsResearchSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/statsResearch.js'), 'utf8');
  const chartSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/charts.js'), 'utf8');
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const coreCss = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/10-core-components.css'), 'utf8');
  const visualCss = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/60-refined-workbench.css'), 'utf8');
  const vibeCss = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/70-vibeui-design-md.css'), 'utf8');
  assert.ok(statsSource.includes('function renderChartCard'), 'statistics cards should use a shared chart-card renderer');
  assert.ok(html.includes('./src/renderer/features/stats/statsResearch.js'));
  [
    'normalizePointForStats',
    'calculateDiversityMetrics',
    'calculateJaccardMatrix',
    'calculateSorensenMatrix',
    'calculateBrayCurtisMatrix',
    'buildMatrixModel',
    'renderHeatmapSvg',
    'resolveZoneLabel',
    'formatZoneLabel',
    'getDisplayZoneName'
  ].forEach(fragment => assert.ok(statsResearchSource.includes(fragment), `stats research core missing ${fragment}`));
  [
    'STATS_CHART_GROUPS',
    'STATS_RECOMMENDED_CHARTS',
    'stats-heatmap-table',
    'data-stats-export',
    'data-stats-chart-toggle',
    'data-stats-chart-action',
    'data-stats-fullscreen',
    'statsFullscreenLayer',
    'document.body.appendChild(layer)',
    'zoneDisplayFromRow',
    'formatZoneDisplayName',
    'zoneChartRow',
    'metricAxisLabel',
    'metricDecimals',
    'rowsToLabeledCsv',
    'Escape',
    'statsHeatPalette',
    'renderHeatmapMatrix',
    'matrixToCsv',
    'matrixToMarkdown',
    'renderHeatmapSvg'
  ].forEach(fragment => assert.ok(statsSource.includes(fragment) || statsResearchSource.includes(fragment), `research stats UI missing ${fragment}`));
  assert.ok(chartSource.includes('chart-bar-depth'));
  assert.ok(chartSource.includes('chartMetricLabel'), 'charts should use explicit metric labels for legends and tooltips');
  assert.ok(chartSource.includes('chartAxisLabel'), 'combo charts should label each y axis by metric semantics');
  assert.ok(chartSource.includes('axisLabels'), 'combo charts should render y-axis semantic labels');
  assert.ok(chartSource.includes('chart-empty-state'));
  assert.ok(chartSource.includes('donutSvgFromCounts(entries, palette, settings, donut = true, chartKey = \'donut\')'));
  assert.ok(chartSource.includes('arcSlicePath(center, innerRadius, outerRadius, startAngle, endAngle)'));
  assert.ok(chartSource.includes('donut-svg-pie'));
  assert.ok(visualCss.includes('.chart-bar-depth'));
  assert.ok(visualCss.includes('.donut-center-plate'));
  assert.ok(visualCss.includes('.motion-disabled .chart-bar-group'));
  assert.ok(!visualCss.includes('transform: scale(1.018)'), 'donut hover must not move its own hit target');
  assert.ok(!vibeCss.includes('.motion-hover .donut-slice:hover {\n  filter:'), 'donut hover must not use per-slice hover filters');
  [
    '#statsModal .stats-control-card',
    '#statsModal .chart-card h3',
    '#statsModal .stats-chart-head',
    '#statsModal .stats-chart-caption',
    '.chart-scroll-area::-webkit-scrollbar',
    '.legend-item strong',
    '.chart-empty-state',
    '.chart-value'
  ].forEach(selector => assert.ok(vibeCss.includes(selector), `${selector} must stay in the final visual layer`));
  [
    '.stats-heatmap-table',
    '.stats-heatmap-scroll',
    '.stats-heatmap-cell',
    '.heat-level-5',
    '.stats-center-layout',
    '.stats-chart-grid',
    '.stats-card-grid',
    '.stats-fullscreen-layer',
    '.stats-text-cell',
    '.heat-palette-warm',
    '.heat-palette-default',
    '.stats-export-grid',
    '.stats-notes-list'
  ].forEach(selector => assert.ok(coreCss.includes(selector), `${selector} must support research stats UI`));
  assert.ok(coreCss.includes('z-index: 10000'), 'statistics fullscreen overlay must stay above ordinary modals');
  assert.ok(coreCss.includes('z-index: 10001'), 'statistics fullscreen dialog must stay above its overlay backdrop');
  ['zh.js', 'en.js'].forEach(name => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/renderer/i18n', name), 'utf8');
    [
      'statsChartDisplayControl',
      'statsChartGroupOverview',
      'statsChartGroupSimilarity',
      'statsChartRecommended',
      'statsChartHideAll',
      'statsFullscreen',
      'statsHeatPaletteWarm',
      'statsHeatPaletteDefault',
      'statsExportProjectSummary',
      'statsExportZoneStats',
      'statsExportJaccard',
      'statsExportMarkdownSummary',
      'statsExportHeatmapSvg',
      'statsMetricShannon',
      'statsMetricSimpsonDiversity',
      'statsMetricPielou',
      'statsMetricHillQ0',
      'statsMetricHillQ1',
      'statsMetricHillQ2',
      'statsAxisMetricValue',
      'statsAxisEffectiveSpecies',
      'statsColumnSpeciesKey'
    ].forEach(key => assert.ok(source.includes(key), `${name} missing ${key}`));
  });
  assert.ok(!statsSource.includes("label: zoneDisplayText(row.label)"), 'zone chart rows must reuse the shared zone display helper');
  assert.ok(!statsSource.includes("engine.rowsToCsv(headers, rows)"), 'diversity CSV export must not expose internal metric keys');
}

function assertClose(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

function testResearchStatsFormulaContract() {
  const diversity = statsResearch.calculateDiversityMetrics({ A: 5, B: 5 });
  assertClose(diversity.shannon, 0.693147, 0.00001, 'Shannon must match expected value');
  assert.strictEqual(diversity.simpsonDominance, 0.5);
  assert.strictEqual(diversity.simpsonDiversity, 0.5);
  assertClose(diversity.pielou, 1, 0.00001, 'Pielou must match expected value');
  assertClose(diversity.margalef, 1 / Math.log(10), 0.00001, 'Margalef must match expected value');
  assertClose(diversity.menhinick, 2 / Math.sqrt(10), 0.00001, 'Menhinick must match expected value');
  assert.strictEqual(statsResearch.calculateDiversityMetrics({ A: 7, B: 3 }).bergerParker, 0.7);
  const hill = statsResearch.calculateHillNumbers({ A: 5, B: 5 });
  assert.strictEqual(hill.q0, 2);
  assertClose(hill.q1, 2, 0.00001, 'Hill q1 must match expected value');
  assert.strictEqual(hill.q2, 2);

  const sets = {
    A: new Set(['a', 'b', 'c']),
    B: new Set(['b', 'c', 'd'])
  };
  const jaccard = statsResearch.calculateJaccardMatrix(sets);
  const sorensen = statsResearch.calculateSorensenMatrix(sets);
  assert.strictEqual(jaccard.cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0.5);
  assertClose(sorensen.cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0.666667, 0.000001, 'Sorensen must match expected value');

  const bray = statsResearch.calculateBrayCurtisMatrix({
    A: new Map([['a', 5], ['b', 5]]),
    B: new Map([['a', 5], ['b', 0]])
  });
  assertClose(bray.cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0.333333, 0.000001, 'Bray-Curtis must match expected value');

  const twoByTwo = statsResearch.calculateJaccardMatrix({
    'Zone A': new Set(['a', 'b']),
    'Zone B': new Set(['b', 'c'])
  });
  assertClose(twoByTwo.cells.find(cell => cell.rowId === 'Zone A' && cell.columnId === 'Zone B').value, 1 / 3, 0.001, 'Jaccard 2x2 must match expected value');
  assert.strictEqual(twoByTwo.cells.find(cell => cell.rowId === 'Zone A' && cell.columnId === 'Zone A').value, 1);
  assert.strictEqual(statsResearch.calculateJaccardMatrix({ A: new Set(), B: new Set() }).cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, null);
  assert.strictEqual(statsResearch.calculateJaccardMatrix({ A: new Set(['a']), B: new Set() }).cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0);

  const countMatrix = statsResearch.buildMatrixModel({
    rows: [{ id: 'r', label: 'R' }],
    columns: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    cells: [
      { rowId: 'r', columnId: 'a', value: 0 },
      { rowId: 'r', columnId: 'b', value: 5 },
      { rowId: 'r', columnId: 'c', value: 10 }
    ],
    valueType: 'count'
  });
  assert.strictEqual(statsResearch.heatLevel(0, countMatrix), 0);
  assert.ok(statsResearch.heatLevel(5, countMatrix) >= 2);
  assert.strictEqual(statsResearch.heatLevel(10, countMatrix), 5);
  assert.strictEqual(statsResearch.resolveZoneLabel('z1', [{ id: 'z1', name: 'Main Zone' }]), 'Main Zone');
  assert.strictEqual(statsResearch.formatZoneLabel('N/A', { language: 'en' }), 'Unassigned zone');
  assert.notStrictEqual(statsResearch.resolveZoneLabel('missing-zone', [], { language: 'en' }), 'N/A');

  const zones = [{ id: 'z1', zoneId: 'Z1', name: 'Zone 1' }, { id: 'z2', zoneId: 'Z2', name: 'Zone 2' }];
  const points = [
    { id: 'p1', pointId: 'P1', zoneRef: 'z1', lat: 29, lng: 106, plantNameSci: 'A', plantNameCn: '甲', family: 'F', genus: 'G', images: ['information/images/a.jpg'], phenologyEntries: [{ id: 'e1', floweringState: '开花', surveyDate: '2026-04-01' }] },
    { id: 'p2', pointId: 'P2', zoneRef: 'z1', lat: 29.000001, lng: 106.000001, plantNameSci: 'A', plantNameCn: '甲', phenologyEntries: [] },
    { id: 'p3', pointId: 'P3', zoneRef: 'z2', lat: '', lng: '', plantNameCn: '', phenologyEntries: [] }
  ];
  const original = JSON.stringify({ zones, points });
  const built = statsResearch.buildStatistics(zones, points);
  assert.strictEqual(JSON.stringify({ zones, points }), original, 'statistics functions must not mutate input data');
  assert.strictEqual(built.projectSummary.zoneCount, 2);
  assert.strictEqual(built.zoneSummaries.length, 2);
  assert.ok(built.dataQuality.issues.missingScientificName >= 1);
  assert.ok(built.dataQuality.issues.missingCoordinate >= 1);
  assert.ok(built.dataQuality.duplicateCandidates.length >= 1);
  assert.ok(built.taxonomyCompleteness.familyCompleteness > 0);
  assert.ok(Array.isArray(built.taxonomySourceSummary));
  assert.ok(Array.isArray(built.taxonomyVerificationSummary));
  assert.ok(built.heatmapMatrices.jaccard.cells.length > 0);

  const csv = statsResearch.matrixToCsv(built.heatmapMatrices.jaccard);
  assert.ok(csv.charCodeAt(0) === 0xFEFF, 'CSV export must include UTF-8 BOM');
  const json = JSON.parse(statsResearch.statisticsFullJson(built));
  assert.ok(json.generatedAt);
  assert.ok(json.metricDefinitions.length);
  assert.ok(json.formulaNotes.length);
  assert.ok(json.taxonomyCompleteness);
  assert.ok(json.familyComposition);
  assert.ok(json.genusComposition);
  const svg = statsResearch.renderHeatmapSvg(built.heatmapMatrices.jaccard);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('<rect'));
  assert.ok(!/(href|src)=["']https?:\/\//.test(svg), 'SVG must not reference external resources');
  assert.ok(!/NaN|undefined|null/.test(svg), 'SVG must not contain invalid display strings');
  const warmSvg = statsResearch.renderHeatmapSvg(built.heatmapMatrices.jaccard, { palette: 'warm' });
  const defaultSvg = statsResearch.renderHeatmapSvg(built.heatmapMatrices.jaccard, { palette: 'default' });
  assert.ok(warmSvg.includes('#dc2626'), 'warm heatmap SVG must use orange-red palette');
  assert.ok(defaultSvg.includes('#167284'), 'default heatmap SVG must keep the legacy palette');
}

function testReducedInnerHtmlSurface() {
  const querySource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/query/index.js'), 'utf8');
  const recycleSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/recycleBin/index.js'), 'utf8');
  const maintenanceSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/maintenance/index.js'), 'utf8');
  assert.ok(!querySource.includes('innerHTML'));
  assert.ok(!recycleSource.includes('innerHTML'));
  assert.ok(!maintenanceSource.includes('innerHTML'));
}

function testMaintenanceCenterContract() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(process.cwd(), 'preload.js'), 'utf8');
  const ipcSource = fs.readFileSync(path.join(process.cwd(), 'src/main/ipcRegister.js'), 'utf8');
  const loggerSource = fs.readFileSync(path.join(process.cwd(), 'src/main/logger.js'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/app.js'), 'utf8');
  const maintenanceSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/maintenance/index.js'), 'utf8');
  const cssSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/10-core-components.css'), 'utf8');
  const mapSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/map.js'), 'utf8');
  const pointMapSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/points.js'), 'utf8');
  const recycleSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/recycleBin/index.js'), 'utf8');
  const basemapSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/basemap/index.js'), 'utf8');
  const projectSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/project/index.js'), 'utf8');
  const statsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/index.js'), 'utf8');
  const themeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/theme/index.js'), 'utf8');

  [
    'btnOpenMaintenance',
    'maintenanceModal',
    'btnRunHealthCheck',
    'btnRunSafeRepair',
    'btnExportDiagnostics',
    'btnApplySafeMode',
    'btnExitSafeMode',
    'maintenanceSafeModeStatus',
    'btnExportUiSettings',
    'btnImportUiSettings'
  ].forEach(id => {
    assert.ok(html.includes(`id="${id}"`), `${id} must exist in maintenance UI`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must be registered`);
  });
  assert.ok(html.indexOf('./src/renderer/features/project/index.js') < html.indexOf('./src/renderer/features/maintenance/index.js'));
  assert.ok(html.indexOf('./src/renderer/features/maintenance/index.js') < html.indexOf('./src/renderer/app.js'));
  assert.ok(appSource.includes('bindMaintenanceEvents'));
  assert.ok(appSource.includes('syncMaintenanceSafeModeUi'));
  [
    "invoke('settings:importJson'",
    "invoke('settings:exportJson'",
    "invoke('log:listRecent'",
    "invoke('log:cleanup'",
    "invoke('log:exportDiagnostics'",
    "invoke('maintenance:checkImageRefs'"
  ].forEach(fragment => assert.ok(preloadSource.includes(fragment), `preload missing ${fragment}`));
  [
    "handle('settings:importJson'",
    "handle('settings:exportJson'",
    "handle('log:listRecent'",
    "handle('log:cleanup'",
    "handle('log:exportDiagnostics'",
    "handle('maintenance:checkImageRefs'"
  ].forEach(fragment => assert.ok(ipcSource.includes(fragment), `IPC missing ${fragment}`));
  assert.ok(loggerSource.includes('function listRecentLogs'));
  assert.ok(loggerSource.includes('function cleanupOldLogs'));
  assert.ok(maintenanceSource.includes('MAINTENANCE_SETTINGS_SCHEMA'));
  assert.ok(maintenanceSource.includes('function createMaintenanceSafeModeTheme'));
  assert.ok(maintenanceSource.includes("createThemeDefaults('linear-minimal')"));
  assert.ok(maintenanceSource.includes('function exitSafeModeSettings'));
  assert.ok(maintenanceSource.includes('previousUiTheme'));
  assert.ok(maintenanceSource.includes('syncMaintenanceSafeModeUi'));
  assert.ok(maintenanceSource.includes('SAFE_MODE_LOCKED_IDS'));
  assert.ok(maintenanceSource.includes('SAFE_MODE_READONLY_FIELD_IDS'));
  assert.ok(maintenanceSource.includes('SAFE_MODE_DYNAMIC_LOCKED_SELECTORS'));
  assert.ok(maintenanceSource.includes('function guardMaintenanceReadOnlyAction'));
  assert.ok(maintenanceSource.includes('function enforceSafeModeMapBrowseOnly'));
  [
    "'btnSave'",
    "'btnApplyZone'",
    "'btnApplyPoint'",
    "'btnRunMerge'",
    "'btnRunManualBackup'",
    "'btnExportDiagnostics'"
  ].forEach(fragment => assert.ok(maintenanceSource.includes(fragment), `safe mode lock list missing ${fragment}`));
  assert.ok(mapSource.includes("isMaintenanceReadOnlyMode() && mode !== 'browse'"));
  assert.ok(mapSource.includes("guardMaintenanceReadOnlyAction('map-add-point')"));
  assert.ok(pointMapSource.includes("guardMaintenanceReadOnlyAction('create-point')"));
  assert.ok(pointMapSource.includes("guardMaintenanceReadOnlyAction('confirm-point')"));
  assert.ok(recycleSource.includes("guardMaintenanceReadOnlyAction('delete-zone')"));
  assert.ok(recycleSource.includes("guardMaintenanceReadOnlyAction('restore-trash')"));
  assert.ok(basemapSource.includes("guardMaintenanceReadOnlyAction('save-basemap')"));
  assert.ok(basemapSource.includes("guardMaintenanceReadOnlyAction('correct-geometry')"));
  assert.ok(projectSource.includes("guardMaintenanceReadOnlyAction('import-csv')"));
  assert.ok(statsSource.includes("guardMaintenanceReadOnlyAction('stats-settings')"));
  assert.ok(themeSource.includes("guardMaintenanceReadOnlyAction('save-theme')"));
  assert.ok(!maintenanceSource.includes("maintenanceText('cancelCreatePoint')"));
  assert.ok(maintenanceSource.includes('createBackupZip(state.projectDir, \'\', \'maintenance\')'));
  assert.ok(maintenanceSource.includes('maintenanceSafeRepairScope'));
  assert.ok(!maintenanceSource.includes('deleteCurrent'));
  assert.ok(!maintenanceSource.includes('state.points = state.points.filter'));
  assert.ok(fs.readFileSync(path.join(process.cwd(), 'src/renderer/utils/dialogs.js'), 'utf8').includes("t('cancelAction')"));
  assert.ok(cssSource.includes('.maintenance-grid'));
  assert.ok(cssSource.includes('.safe-mode-locked-control'));
  ['zh.js', 'en.js'].forEach(name => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/renderer/i18n', name), 'utf8');
    [
      'openMaintenanceCenter',
      'maintenanceCenterTitle',
      'maintenanceSafeRepair',
      'maintenanceExportDiagnostics',
      'maintenanceApplySafeMode',
      'maintenanceExitSafeMode',
      'maintenanceSafeModeOn',
      'maintenanceSafeModeReadOnlyBlocked',
      'maintenanceSafeModeReadOnlyTitle',
      'cancelAction'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testSpeciesReferenceContract() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(process.cwd(), 'preload.js'), 'utf8');
  const ipcSource = fs.readFileSync(path.join(process.cwd(), 'src/main/ipcRegister.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(process.cwd(), 'src/main/speciesReferenceService.js'), 'utf8');
  const rendererSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/speciesReference/index.js'), 'utf8');
  const querySource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/query/index.js'), 'utf8');
  const projectSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/project/index.js'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/app.js'), 'utf8');
  const stateSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/state/store.js'), 'utf8');
  const maintenanceSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/maintenance/index.js'), 'utf8');
  const cssSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/10-core-components.css'), 'utf8');

  [
    'btnOpenSpeciesReference',
    'btnOpenSpeciesReferenceInline',
    'speciesReferenceModal',
    'speciesReferenceSciInput',
    'speciesReferenceCommonInput',
    'btnRunSpeciesReference',
    'speciesReferenceImageTokenInput',
    'speciesReferenceApplyTaxonomy',
    'btnOpenInatTokenPage',
    'btnRunSpeciesImageCompare',
    'speciesReferenceImageCompareStatus',
    'speciesReferenceDetail',
    'speciesReferenceResults',
    'btnPreviewSpeciesReferenceImage',
    'btnDiscardSpeciesReference',
    'btnApplySpeciesReference'
  ].forEach(id => {
    assert.ok(html.includes(`id="${id}"`), `${id} must exist in species reference UI`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must be registered`);
  });

  [
    'familyInput',
    'genusInput',
    'identificationStatus',
    'taxonomySource',
    'taxonomyVerificationStatus',
    'btnSuggestTaxonomy',
    'btnApplyTaxonomySuggestion',
    'btnVerifyTaxonomy',
    'btnDoubtfulTaxonomy',
    'taxonomyCandidateList'
  ].forEach(id => {
    assert.ok(html.includes(`id="${id}"`), `${id} must exist in taxonomy point UI`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must be registered`);
  });

  assert.ok(html.indexOf('./src/renderer/features/phenology/index.js') < html.indexOf('./src/renderer/features/speciesReference/index.js'));
  assert.ok(html.indexOf('./src/renderer/features/speciesReference/index.js') < html.indexOf('./src/renderer/app.js'));
  assert.ok(appSource.includes('bindSpeciesReferenceEvents'));
  assert.ok(appSource.includes('bindTaxonomyEvents'));
  assert.ok(preloadSource.includes("referenceQuery: payload => invoke('species:referenceQuery'"));
  assert.ok(preloadSource.includes("suggestTaxonomy: payload => invoke('species:suggestTaxonomy'"));
  assert.ok(preloadSource.includes("imageCompare: payload => invoke('species:imageCompare'"));
  assert.ok(ipcSource.includes("handle('species:referenceQuery'"));
  assert.ok(ipcSource.includes("handle('species:suggestTaxonomy'"));
  assert.ok(ipcSource.includes("handle('species:imageCompare'"));
  assert.ok(ipcSource.includes("require('./speciesReferenceService')"));
  assert.ok(serviceSource.includes('https://api.gbif.org/v1'));
  assert.ok(serviceSource.includes('https://api.inaturalist.org/v1'));
  assert.ok(serviceSource.includes('/v1/computervision/score_image'));
  assert.ok(serviceSource.includes('MAX_COMPARE_IMAGE_BYTES'));
  assert.ok(serviceSource.includes('querySpeciesImageCompare'));
  assert.ok(serviceSource.includes('normalizeSelectedImage'));
  assert.ok(serviceSource.includes('/descriptions'));
  assert.ok(serviceSource.includes('/vernacularNames'));
  assert.ok(serviceSource.includes('/media'));
  assert.ok(serviceSource.includes('/speciesProfiles'));
  assert.ok(serviceSource.includes('/v1/taxa/${item.key}'));
  assert.ok(serviceSource.includes('DETAIL_ENRICH_LIMIT'));
  assert.ok(!serviceSource.includes('writeFile'));
  assert.ok(!serviceSource.includes('localStorage'));
  assert.ok(rendererSource.includes('let speciesReferenceCache = null'));
  assert.ok(rendererSource.includes('clearSpeciesReferenceCache'));
  assert.ok(rendererSource.includes("guardMaintenanceReadOnlyAction('apply-species-reference')"));
  assert.ok(rendererSource.includes('openImagePreview(src, caption, imageSet)'));
  assert.ok(rendererSource.includes('renderSpeciesReferenceDetail'));
  assert.ok(rendererSource.includes('recommendationText'));
  assert.ok(rendererSource.includes('safeExternalUrl'));
  assert.ok(rendererSource.includes('INATURALIST_API_TOKEN_URL'));
  assert.ok(rendererSource.includes('https://www.inaturalist.org/users/api_token'));
  assert.ok(rendererSource.includes('externalLinkHtml'));
  assert.ok(rendererSource.includes('class="species-reference-link"'));
  assert.ok(rendererSource.includes('window.plantApp.window.openExternal'));
  assert.ok(rendererSource.includes('data-external-url'));
  assert.ok(rendererSource.includes('event.stopPropagation()'));
  assert.ok(rendererSource.includes('function selectSpeciesReferenceSuggestion'));
  assert.ok(rendererSource.includes('data-suggestion-id'));
  assert.ok(rendererSource.includes('runSpeciesImageCompare'));
  assert.ok(rendererSource.includes('speciesReferenceImageTokenInput'));
  assert.ok(rendererSource.includes('species-reference-compared-thumb'));
  assert.ok(rendererSource.includes('speciesReferenceApplyTaxonomy'));
  assert.ok(fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/phenology/index.js'), 'utf8').includes('applyTaxonomyFieldsToPoint'));
  assert.ok(projectSource.includes('data-i18n-placeholder'));
  assert.ok(rendererSource.includes('await persistProject()'), 'reference suggestions may persist only after user apply');
  assert.ok(!rendererSource.includes('localStorage'));
  assert.ok(!rendererSource.includes('sessionStorage'));
  assert.ok(!stateSource.includes('speciesReferenceCache'), 'species reference cache must not become project state');
  assert.ok(maintenanceSource.includes("'btnApplySpeciesReference'"));
  assert.ok(!maintenanceSource.includes("'btnOpenSpeciesReference'"), 'safe mode should allow read-only reference lookup');
  assert.ok(cssSource.includes('.species-reference-panel'));

  ['zh.js', 'en.js'].forEach(name => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/renderer/i18n', name), 'utf8');
    [
      'openSpeciesReference',
      'speciesReferenceTitle',
      'runSpeciesReference',
      'speciesReferenceApply',
      'speciesReferenceDiscard',
      'speciesReferenceConservation',
      'speciesReferenceOpenWiki',
      'speciesReferenceDetailEmpty',
      'speciesReferencePreviewImage',
      'speciesReferenceRunImageCompare',
      'speciesReferenceImageTokenPlaceholder',
      'speciesReferenceOpenTokenPage',
      'speciesReferenceTokenStepLogin',
      'speciesReferenceTokenStepOpen',
      'speciesReferenceTokenStepCopy',
      'speciesReferenceTokenStepPrivacy',
      'speciesReferenceImageCompareFailed',
      'speciesReferenceComparedImage',
      'speciesReferenceClassification',
      'speciesReferenceApplyTaxonomy',
      'speciesReferenceRecommendedFields',
      'speciesReferenceUnmappedToNote',
      'taxonomySuggest',
      'taxonomyApplySuggestion',
      'taxonomyStatusManuallyVerified',
      'taxonomySourceBoth',
      'statsExportTaxonomyCompletion',
      'statsExportTaxonomyCandidates'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });

  const gbif = speciesReferenceService.normalizeGbifMatch({
    usageKey: 2687885,
    scientificName: 'Ginkgo biloba L.',
    canonicalName: 'Ginkgo biloba',
    rank: 'SPECIES',
    status: 'ACCEPTED',
    confidence: 100,
    matchType: 'EXACT',
    family: 'Ginkgoaceae',
    genus: 'Ginkgo'
  });
  assert.strictEqual(gbif.scientificName, 'Ginkgo biloba L.');
  assert.strictEqual(gbif.classification.family, 'Ginkgoaceae');

  const inat = speciesReferenceService.normalizeINaturalistTaxon({
    id: 64350,
    name: 'Ginkgo biloba',
    rank: 'species',
    is_active: true,
    observations_count: 43523,
    preferred_common_name: '银杏',
    conservation_status: { status_name: 'endangered' },
    wikipedia_url: 'https://example.test/wiki',
    default_photo: { medium_url: 'https://example.test/ginkgo.jpg' }
  });
  assert.strictEqual(inat.commonName, '银杏');
  assert.strictEqual(inat.observationsCount, 43523);
  assert.strictEqual(inat.conservationStatus, 'endangered');
  assert.strictEqual(inat.images.length, 1);
  const vision = speciesReferenceService.normalizeVisionSuggestion({
    combined_score: 0.82,
    taxon: {
      id: 64350,
      name: 'Ginkgo biloba',
      rank: 'species',
      preferred_common_name: 'Ginkgo',
      default_photo: { medium_url: 'https://example.test/ginkgo.jpg' }
    }
  });
  assert.strictEqual(vision.sourceLabel, 'iNaturalist CV');
  assert.strictEqual(vision.confidence, 82);
  assert.ok(rendererSource.includes('speciesReferenceOpenWiki'));
  assert.ok(rendererSource.includes('photoAttribution'));
  assert.strictEqual(speciesReferenceService.dedupeSuggestions([gbif, gbif, inat]).length, 2);

  const taxonomyCandidates = speciesReferenceService.normalizeTaxonomyCandidates([
    { source: 'gbif', scientificName: 'Osmanthus fragrans', canonicalName: 'Osmanthus fragrans', rank: 'species', confidence: 95, classification: { family: 'Oleaceae', genus: 'Osmanthus' } },
    { source: 'inaturalist', scientificName: 'Osmanthus fragrans', canonicalName: 'Osmanthus fragrans', rank: 'species', confidence: 0.91, classification: { family: 'Oleaceae', genus: 'Osmanthus' } },
    { source: 'gbif', scientificName: 'Prunus mume', canonicalName: 'Prunus mume', rank: 'species', confidence: 70, classification: { family: 'Rosaceae', genus: 'Prunus' } }
  ], 'Osmanthus fragrans', 'Osmanthus fragrans');
  const taxonomySummary = speciesReferenceService.summarizeTaxonomySuggestion({ scientificName: 'Osmanthus fragrans' }, taxonomyCandidates, 'Osmanthus fragrans');
  assert.strictEqual(taxonomySummary.suggestedFamily, 'Oleaceae');
  assert.strictEqual(taxonomySummary.suggestedGenus, 'Osmanthus');
  assert.ok(taxonomySummary.candidates.length <= 5);
  const tieSummary = speciesReferenceService.summarizeTaxonomySuggestion({}, speciesReferenceService.normalizeTaxonomyCandidates([
    { source: 'gbif', scientificName: 'A', classification: { family: 'Oleaceae', genus: 'Osmanthus' } },
    { source: 'inaturalist', scientificName: 'B', classification: { family: 'Rosaceae', genus: 'Prunus' } }
  ], '', ''), '');
  assert.strictEqual(tieSummary.suggestedFamily, '');
  assert.strictEqual(tieSummary.confidenceLabel, 'unknown');
  const lockedSummary = speciesReferenceService.summarizeTaxonomySuggestion({
    existingFamily: 'Oleaceae',
    taxonomyVerificationStatus: 'manuallyVerified',
    allowOverwriteManual: false
  }, taxonomyCandidates, 'Osmanthus fragrans');
  assert.strictEqual(lockedSummary.overwriteBlocked, true);

  [
    'queryMissingScientificName',
    'queryMissingCommonName',
    'queryMissingPhenology',
    'queryMissingImage'
  ].forEach(fragment => {
    assert.ok(html.includes(fragment), `query UI missing ${fragment}`);
  });
  assert.ok(html.includes('queryCompleteness'), 'query UI missing queryCompleteness');
  assert.ok(elementsSource.includes('queryCompleteness'), 'query element missing queryCompleteness');
  assert.ok(querySource.includes('pointCompletenessFlags'));
  assert.ok(querySource.includes('openReferenceFromQueryResult'));
  assert.ok(querySource.includes('openSpeciesReferenceCenter()'));
  assert.ok(querySource.includes('query-reference-btn'));
  assert.ok(appSource.includes('ui.queryCompleteness'));
}

async function testTaxonomySuggestionRuntimeContract() {
  const empty = await speciesReferenceService.suggestTaxonomyFromReferences({});
  assert.strictEqual(empty.ok, false);
  assert.strictEqual(empty.candidates.length, 0);
  assert.ok(empty.warnings.length);
}

function testReadmeIsUserManual() {
  const readme = readRepositoryReadme();
  [
    '基本使用流程 | Basic Workflow',
    '维护中心 | Maintenance Center',
    '导入导出 | Import and Export',
    '数据安全提示 | Data Safety Notes',
    'Main Features',
    'Basic Workflow',
    '仍可浏览信息、查询统计并拖动查看地图',
    'Browsing, query, statistics viewing, and map dragging remain available',
    '物种参考',
    'Species reference'
  ].forEach(fragment => assert.ok(readme.includes(fragment), `README missing ${fragment}`));
  [
    'npm install',
    'npm run dist',
    'Versioning and Maintenance',
    'Tech Stack',
    'Project Structure'
  ].forEach(fragment => assert.ok(!readme.includes(fragment), `README should stay user-facing and omit ${fragment}`));
}

function testElectronSecurityContract() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(process.cwd(), 'preload.js'), 'utf8');
  const windowSource = fs.readFileSync(path.join(process.cwd(), 'src/main/windowManager.js'), 'utf8');
  const ipcSource = fs.readFileSync(path.join(process.cwd(), 'src/main/ipcRegister.js'), 'utf8');
  const pathGuardSource = fs.readFileSync(path.join(process.cwd(), 'src/main/pathGuard.js'), 'utf8');
  const securitySource = fs.readFileSync(path.join(process.cwd(), 'src/main/securityPolicy.js'), 'utf8');
  const errorCodesSource = fs.readFileSync(path.join(process.cwd(), 'src/main/errorCodes.js'), 'utf8');

  [
    'contextIsolation: true',
    'nodeIntegration: false',
    'sandbox: true',
    'webSecurity: true',
    'allowRunningInsecureContent: false',
    'webviewTag: false',
    'setWindowOpenHandler',
    'will-navigate'
  ].forEach(fragment => assert.ok(windowSource.includes(fragment), `window security missing ${fragment}`));

  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(html.includes("object-src 'none'"));
  assert.ok(html.includes("frame-src 'none'"));
  assert.ok(html.includes('https://unpkg.com'));

  assert.ok(ipcSource.includes('assertTrustedIpcSender'));
  assert.ok(ipcSource.includes("handle('window:openExternal'"));
  assert.ok(preloadSource.includes('contextBridge.exposeInMainWorld'));
  assert.ok(preloadSource.includes("invoke('window:openExternal'"));
  ['readFile', 'writeFile', 'deleteFile', 'exec('].forEach(fragment => {
    assert.ok(!preloadSource.includes(fragment), `preload must not expose ${fragment}`);
  });

  assert.ok(securitySource.includes('APP_INDEX_URL'));
  assert.ok(securitySource.includes('shell.openExternal'));
  assert.ok(securitySource.includes("['http:', 'https:']"));
  assert.ok(errorCodesSource.includes('UNTRUSTED_IPC_SENDER'));
  assert.ok(errorCodesSource.includes('UNTRUSTED_PROJECT_DIR'));
  assert.ok(errorCodesSource.includes('INVALID_EXTERNAL_URL'));

  assert.ok(pathGuardSource.includes('trustedProjectDirs'));
  assert.ok(pathGuardSource.includes('trustProjectDirFromDialog'));
  assert.ok(pathGuardSource.includes('assertTrustedProjectDir'));

  const rendererDir = path.join(process.cwd(), 'src/renderer');
  const rendererFiles = [];
  function collect(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(fullPath);
      if (entry.isFile() && entry.name.endsWith('.js')) rendererFiles.push(fullPath);
    });
  }
  collect(rendererDir);
  rendererFiles.forEach(filePath => {
    const source = fs.readFileSync(filePath, 'utf8');
    ['require(\'fs\')', 'require("fs")', 'require(\'child_process\')', 'require("child_process")', 'ipcRenderer'].forEach(fragment => {
      assert.ok(!source.includes(fragment), `${path.relative(process.cwd(), filePath)} must not use ${fragment}`);
    });
  });
}

function testRepositoryHygieneContract() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  assert.strictEqual(packageJson.license, 'UNLICENSED');
  assert.strictEqual(packageJson.private, true);
  [
    'check:syntax',
    'check:size',
    'check:repo',
    'self-check',
    'verify'
  ].forEach(scriptName => assert.ok(packageJson.scripts[scriptName], `package script missing ${scriptName}`));
  assert.ok(packageJson.scripts.verify.includes('check:size'), 'verify must include file size governance');

  [
    'LICENSE.md',
    'EULA.md',
    'SCHOOL_USE_LICENSE.md',
    'THIRD_PARTY_NOTICES.md',
    'PRIVACY.md',
    'SECURITY.md',
    'CHANGELOG.md',
    'VERSION_POLICY.md',
    'CONTRIBUTING.md',
    'CONTRIBUTING_PRIVATE.md'
  ].forEach(fileName => assert.ok(repositoryFileExists(fileName), `${fileName} must exist`));

  [
    'ARCHITECTURE.md',
    'DATA_SCHEMA.md',
    'FILE_SIZE_POLICY.md',
    'TYPE_SYSTEM_PLAN.md',
    'SQLITE_SCHEMA.md',
    'SQLITE_GUIDE.md',
    'SQLITE_READINESS.md',
    'JSON_SQLITE_EXCHANGE.md',
    'DATA_MIGRATION_PLAN.md',
    'DEV_GUIDE.md',
    'TESTING_GUIDE.md',
    'RELEASE_GUIDE.md',
    'USER_MANUAL.md',
    'BACKUP_GUIDE.md',
    'IMPORT_EXPORT_GUIDE.md',
    'DIAGNOSTICS_GUIDE.md',
    'COMMERCIAL_SAMPLE_CHECKLIST.md',
    'MAINTENANCE_GUIDE.md',
    'ADR/0001-local-first-electron.md',
    'ADR/0002-proprietary-school-use-license.md',
    'ADR/0003-ipc-security-boundary.md',
    'ADR/0004-data-storage-strategy.md'
  ].forEach(fileName => assert.ok(readWorkspaceDoc(fileName).length > 0, `${fileName} must be documented`));

  assert.ok(readWorkspaceDoc('BASELINE_AUDIT.md').includes('No business data format was changed'));
  assert.ok(readWorkspaceDoc('TESTING.md').includes('npm run verify'));
  assert.ok(readWorkspaceDoc('MAINTENANCE.md').includes('Safe mode should remain browse-only'));
  assert.ok(readWorkspaceDoc('RELEASE_CHECKLIST.md').includes('npm run dist'));
  assert.ok(readWorkspaceDoc('SECURITY_MODEL.md').includes('contextIsolation'));
  assert.ok(readWorkspaceDoc('IPC_CONTRACT.md').includes('window:openExternal'));
  [
    '.github/workflows/ci.yml',
    '.github/CODEOWNERS',
    '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/feature_request.yml',
    '.github/ISSUE_TEMPLATE/release_checklist.yml',
    '.github/ISSUE_TEMPLATE/config.yml'
  ].forEach(fileName => assert.ok(repositoryFileExists(fileName), `${fileName} must exist`));
  assert.ok(readRepositoryPath('.github/workflows/ci.yml').includes('npm run verify'));
  assert.ok(readRepositoryPath('.github/workflows/ci.yml').includes('- dev'));
  assert.ok(readRepositoryPath('.github/workflows/ci.yml').includes('npm run test --if-present'));
  assert.ok(readRepositoryPath('.github/workflows/ci.yml').includes('npm run build --if-present'));
  assert.ok(readRepositoryPath('.github/pull_request_template.md').includes('Compatibility'));
  assert.ok(readRepositoryPath('.github/pull_request_template.md').includes('Data Format Impact'));
  assert.ok(readRepositoryPath('.github/pull_request_template.md').includes('Rollback'));
  assert.ok(readRepositoryPath('.github/ISSUE_TEMPLATE/config.yml').includes('blank_issues_enabled: false'));
  assert.ok(repositoryFileExists('app/package-lock.json'), 'package-lock.json must exist');
  assert.ok(repositoryFileExists('.editorconfig'), '.editorconfig must exist');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'scripts', 'check-file-size.js')));
  assert.ok(fs.existsSync(path.join(process.cwd(), 'scripts', 'check-js-syntax.js')));
  assert.ok(fs.existsSync(path.join(process.cwd(), 'scripts', 'check-repo-hygiene.js')));
  assert.ok(fs.existsSync(path.join(process.cwd(), 'build', 'icon.ico')), 'installer icon must be present');

  const readme = readRepositoryReadme();
  assert.ok(readme.includes('版权与使用限制 | Copyright and Usage Restrictions'));
  assert.ok(readme.includes('项目数据 | Project Data'));
  assert.ok(readme.includes('校内教学、科研、植物资源统计和维护用途'));
  assert.ok(readme.includes('Internal campus use for teaching, research, plant resource statistics, and maintenance'));

  const copyright = readRepositoryFile('Copyright.md');
  assert.ok(copyright.includes('2026'));
  assert.ok(copyright.includes('YU GangZuo'));

  const gitignore = readRepositoryFile('.gitignore');
  assert.ok(!gitignore.split(/\r?\n/).map(line => line.trim()).includes('build/'));
  assert.ok(gitignore.includes('!app/build/icon.ico'));
}

function testDocumentationUpdateContract() {
  const dataSchema = readWorkspaceDoc('DATA_SCHEMA.md');
  assert.ok(dataSchema.includes('family'));
  assert.ok(dataSchema.includes('taxonomyVerificationStatus'));
  assert.ok(dataSchema.includes('Database Planning Status'));
  assert.ok(dataSchema.includes('SQLITE_SCHEMA.md'));
  assert.ok(!dataSchema.includes('Complete provider responses are stored'));

  const fileSizePolicy = readWorkspaceDoc('FILE_SIZE_POLICY.md');
  assert.ok(fileSizePolicy.includes('Over 1000'));
  assert.ok(fileSizePolicy.includes('Allowlist required'));
  assert.ok(fileSizePolicy.includes('npm run check:size'));
  assert.ok(fileSizePolicy.includes('Current Split Review Notes'));
  assert.ok(fileSizePolicy.includes('app/src/renderer/app.js'));

  const typePlan = readWorkspaceDoc('TYPE_SYSTEM_PLAN.md');
  assert.ok(typePlan.includes('checkJs'));
  assert.ok(typePlan.includes('Do not convert the whole renderer in one pass'));

  const sqliteSchema = readWorkspaceDoc('SQLITE_SCHEMA.md');
  assert.ok(sqliteSchema.includes('SQLite is a planned optional local data layer'));
  assert.ok(sqliteSchema.includes('No SQLite database file, migration script, or conversion command'));
  assert.ok(sqliteSchema.includes('taxonomy_candidates'));

  const sqliteGuide = readWorkspaceDoc('SQLITE_GUIDE.md');
  assert.ok(sqliteGuide.includes('Convert JSON to SQLite'));
  assert.ok(sqliteGuide.includes('Planned'));

  const sqliteReadiness = readWorkspaceDoc('SQLITE_READINESS.md');
  assert.ok(sqliteReadiness.includes('SQLite remains a planned optional local data layer'));
  assert.ok(sqliteReadiness.includes('JSON to SQLite converter'));
  assert.ok(sqliteReadiness.includes('Not implemented'));
  assert.ok(sqliteReadiness.includes('Backup-before-conversion'));

  const exchangePlan = readWorkspaceDoc('JSON_SQLITE_EXCHANGE.md');
  assert.ok(exchangePlan.includes('JSON To SQLite'));
  assert.ok(exchangePlan.includes('SQLite To JSON'));
  assert.ok(exchangePlan.includes('unknown field preservation'));

  const migrationPlan = readWorkspaceDoc('DATA_MIGRATION_PLAN.md');
  assert.ok(migrationPlan.includes('Existing JSON projects remain valid'));
  assert.ok(migrationPlan.includes('A backup is required'));

  const architecture = readWorkspaceDoc('ARCHITECTURE.md');
  assert.ok(architecture.includes('source-link and token validation documented'));
  assert.ok(architecture.includes('Database and schema migration work is deferred'));

  const adr = readWorkspaceDoc('ADR/0004-data-storage-strategy.md');
  assert.ok(adr.includes('database structure changes are deferred'));
  assert.ok(adr.includes('Do not introduce database tables, schema migrations, or format-conversion code'));

  const testingGuide = readWorkspaceDoc('TESTING_GUIDE.md');
  [
    'Species Reference Link And Token Smoke Test',
    'system default browser opens the target page',
    'https://www.inaturalist.org/users/api_token',
    'token text is not saved into project JSON'
  ].forEach(fragment => assert.ok(testingGuide.includes(fragment), `TESTING_GUIDE missing ${fragment}`));

  const userManual = readWorkspaceDoc('USER_MANUAL.md');
  [
    '## Species Reference',
    'Source, Wiki, and attribution links open through the system default browser',
    'copy the temporary API token',
    'does not store it in project JSON'
  ].forEach(fragment => assert.ok(userManual.includes(fragment), `USER_MANUAL missing ${fragment}`));

  const checklist = readWorkspaceDoc('COMMERCIAL_SAMPLE_CHECKLIST.md');
  [
    'Species reference source links open in the system default browser',
    'iNaturalist token page opens from the image comparison area',
    'Database structure changes remain deferred'
  ].forEach(fragment => assert.ok(checklist.includes(fragment), `COMMERCIAL_SAMPLE_CHECKLIST missing ${fragment}`));
}

async function main() {
  testPathGuard();
  testNormalize();
  testExportContracts();
  testRendererIpcContract();
  testRendererUtilityContracts();
  testProjectStoreWritesJson();
  testProjectStoreRejectsInvalidSavePayloads();
  testAtomicTextWrite();
  testLoggerWritesAndCleansUp();
  testMaintenanceServiceImageRefGuard();
  testHtmlErrorDialogWiring();
  testEngineeringSplitContract();
  testVibeUiDesignMdLayer();
  testVibeMotionContract();
  testCssStructureGuards();
  testLegacyThemeCssRemoved();
  testThemeSettingsProgressiveDisclosure();
  testBrandLogoResource();
  testStatisticsChartVisualContract();
  testResearchStatsFormulaContract();
  testReducedInnerHtmlSurface();
  testMaintenanceCenterContract();
  testSpeciesReferenceContract();
  await testTaxonomySuggestionRuntimeContract();
  testReadmeIsUserManual();
  testElectronSecurityContract();
  testRepositoryHygieneContract();
  testDocumentationUpdateContract();
  await testExportWritesAtomicallyAndValidatesContent();
  await testImageImportDoesNotOverwriteExistingArchive();
  await testBackupCreateCleanupAndCounts();
  await testIpcDoesNotMaskFalsePayload();
  console.log('self-check passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
