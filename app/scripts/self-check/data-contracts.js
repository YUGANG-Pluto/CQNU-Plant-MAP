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
    path.join(projectDir, 'information', 'statistics', 'backup'),
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
    projectStore.ensureProjectStructure(projectDir);
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
