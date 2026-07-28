async function testTaxonomySuggestionRuntimeContract() {
  const empty = await speciesReferenceService.suggestTaxonomyFromReferences({});
  assert.strictEqual(empty.ok, false);
  assert.strictEqual(empty.candidates.length, 0);
  assert.ok(empty.warnings.length);
}

function testSqliteExchangeModelContract() {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/main/sqliteExchangeModel.js'), 'utf8');
  assert.ok(!source.includes("require('fs')"), 'SQLite exchange phase 1 must not write files');
  assert.ok(!source.includes('better-sqlite3'), 'SQLite exchange phase 1 must not add runtime database dependency');
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  assert.ok(packageJson.dependencies?.['better-sqlite3'], 'SQLite dependency probe uses better-sqlite3');
  ['sqlite3', 'sql.js'].forEach(name => {
    assert.ok(!packageJson.dependencies?.[name], `${name} must not be installed during better-sqlite3 probe`);
    assert.ok(!packageJson.devDependencies?.[name], `${name} must not be installed during better-sqlite3 probe`);
  });
  const probeSource = fs.readFileSync(path.join(process.cwd(), 'scripts/sqlite-dependency-probe.js'), 'utf8');
  assert.ok(probeSource.includes('os.tmpdir()'));
  assert.ok(probeSource.includes('better-sqlite3'));
  assert.ok(probeSource.includes('prepare('));
  const schemaSource = fs.readFileSync(path.join(process.cwd(), 'src/main/sqliteSchemaService.js'), 'utf8');
  const schemaCheckSource = fs.readFileSync(path.join(process.cwd(), 'scripts/check-sqlite-schema.js'), 'utf8');
  const conversionSource = fs.readFileSync(path.join(process.cwd(), 'src/main/sqliteConversionService.js'), 'utf8');
  const conversionCheckSource = fs.readFileSync(path.join(process.cwd(), 'scripts/test-sqlite-conversion.js'), 'utf8');
  const storageSource = fs.readFileSync(path.join(process.cwd(), 'src/main/storageConversionService.js'), 'utf8');
  const storageCheckSource = fs.readFileSync(path.join(process.cwd(), 'scripts/test-storage-conversion.js'), 'utf8');
  const runtimeCheckSource = fs.readFileSync(path.join(process.cwd(), 'scripts/test-sqlite-runtime-acceptance.js'), 'utf8');
  assert.ok(schemaSource.includes('CREATE TABLE IF NOT EXISTS'));
  assert.ok(schemaSource.includes('better-sqlite3'));
  assert.ok(schemaSource.includes('os.tmpdir()'));
  assert.ok(schemaCheckSource.includes('checkSchemaInTemporaryDatabase'));
  assert.ok(conversionSource.includes('runTemporaryJsonSqliteRoundTrip'));
  assert.ok(conversionSource.includes('writeModelToDatabase'));
  assert.ok(conversionSource.includes('readModelFromDatabase'));
  assert.ok(conversionSource.includes('os.tmpdir()'));
  assert.ok(conversionSource.includes('better-sqlite3'));
  assert.ok(conversionCheckSource.includes('runTemporaryJsonSqliteRoundTrip'));
  assert.ok(storageSource.includes('assertTrustedProjectDir'));
  assert.ok(storageSource.includes('backupService.create'));
  assert.ok(storageSource.includes('rendererDatabaseAccess: false'));
  assert.ok(storageSource.includes('exposesSql: false'));
  assert.ok(storageSource.includes('SQLITE_DB_FILE'));
  assert.ok(storageCheckSource.includes('createSqliteFromJson'));
  assert.ok(storageCheckSource.includes('exportSqliteToJson'));
  assert.ok(runtimeCheckSource.includes('autoWithBothFormatsUsesSqlite'));
  assert.ok(runtimeCheckSource.includes('explicitJsonLoadReadsJsonData'));
  assert.ok(runtimeCheckSource.includes('saveWithoutFormatUsesSqlite'));
  assert.ok(storageSource.includes('listStorageArtifacts'));
  assert.ok(storageSource.includes('deleteStorageArtifacts'));
  assert.strictEqual(storageConversionService.SQLITE_DB_FILE, 'data.db');
  assert.strictEqual(storageConversionService.SQLITE_REPORT_FILE, 'sqlite-conversion-report.json');
  assert.deepStrictEqual(sqliteSchemaService.getExpectedTables(), [
    'project_settings',
    'zones',
    'points',
    'phenology_entries',
    'images',
    'point_images',
    'taxonomy_candidates',
    'export_runs'
  ]);
  assert.strictEqual(
    sqliteSchemaService.validateSchemaTableNames(sqliteSchemaService.getExpectedTables()).ok,
    true
  );
  assert.deepStrictEqual(sqliteConversionService.getConversionTableNames(), [
    'project_settings',
    'zones',
    'points',
    'phenology_entries',
    'images',
    'taxonomy_candidates'
  ]);

  const model = sqliteExchangeModel.buildSqliteModelFromJsonProject({
    settings: { language: 'zh' },
    zones: [],
    points: []
  });
  assert.strictEqual(model.version, sqliteExchangeModel.MODEL_VERSION);
  assert.strictEqual(sqliteExchangeModel.validateSqliteExchangeModel(model).ok, true);
  assert.ok(typeof sqliteExchangeModel.buildConversionReport === 'function');
  assert.ok(typeof sqliteExchangeModel.buildBackupPreflightPlan === 'function');
}

function testElectronSecurityContract() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const preloadSource = fs.readFileSync(path.join(process.cwd(), 'electron/preload/index.ts'), 'utf8');
  const windowSource = fs.readFileSync(path.join(process.cwd(), 'electron/main/windowManager.ts'), 'utf8');
  const ipcSource = fs.readFileSync(path.join(process.cwd(), 'electron/main/ipc/register.ts'), 'utf8');
  const channelSource = fs.readFileSync(path.join(process.cwd(), 'electron/shared/ipc-contract.ts'), 'utf8');
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
  assert.ok(html.includes('./node_modules/leaflet/dist/leaflet.js'));
  assert.ok(html.includes('./node_modules/leaflet-draw/dist/leaflet.draw.js'));
  assert.ok(!/<script[^>]+https?:\/\//i.test(html), 'renderer scripts must be local');
  assert.ok(!/<link[^>]+https?:\/\//i.test(html), 'renderer styles must be local');

  assert.ok(ipcSource.includes('assertTrustedIpcSender'));
  assert.strictEqual(packageJson.main, 'main-dist/main/index.js');
  assert.ok(windowSource.includes("path.join(appRoot, 'main-dist', 'preload', 'index.js')"));
  assert.ok(preloadSource.includes('contextBridge.exposeInMainWorld'));
  [
    ['window.openExternal', 'window:openExternal'],
    ['storage.conversionPreflight', 'storage:conversionPreflight'],
    ['backup.inspectRestore', 'backup:inspectRestore'],
    ['backup.restore', 'backup:restore'],
    ['storage.listArtifacts', 'storage:listArtifacts'],
    ['storage.deleteArtifacts', 'storage:deleteArtifacts'],
    ['storage.createSqliteFromJson', 'storage:createSqliteFromJson'],
    ['storage.exportSqliteToJson', 'storage:exportSqliteToJson']
  ].forEach(([propertyPath, channel]) => {
    assert.ok(ipcSource.includes(`handle(IPC_CHANNELS.${propertyPath}`), `IPC missing ${propertyPath}`);
    assert.ok(preloadSource.includes(`invoke(IPC_CHANNELS.${propertyPath}`), `preload missing ${propertyPath}`);
    assert.ok(channelSource.includes(`'${channel}'`), `channel contract missing ${channel}`);
  });
  ['readFile', 'writeFile', 'deleteFile', 'exec('].forEach(fragment => {
    assert.ok(!preloadSource.includes(fragment), `preload must not expose ${fragment}`);
  });
  ['SELECT ', 'INSERT ', 'CREATE TABLE', 'better-sqlite3', 'data.db'].forEach(fragment => {
    assert.ok(!preloadSource.includes(fragment), `preload must not expose storage detail ${fragment}`);
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
