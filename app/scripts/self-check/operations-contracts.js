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
      const backupSource = fs.readFileSync(path.join(process.cwd(), 'src/main/backupService.js'), 'utf8');
      assert.ok(backupSource.includes('function inspectRestorePlan'));
      assert.ok(backupSource.includes('function restore'));
      assert.ok(backupSource.includes('confirmRestore'));
      assert.ok(backupSource.includes("label: 'pre_restore'"));
      assert.ok(backupSource.includes('normalizeZipEntryName'));
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
    const ipcRegister = requireFresh('../main-dist/main/ipc/register');
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
    const readLog = logger.readLogFile({ name: recent.files[0].name });
    assert.ok(readLog.content.includes('renderer:test'));
    assert.strictEqual(readLog.name, recent.files[0].name);
    assert.strictEqual(readLog.diagnosis.status, 'issues');
    assert.ok(readLog.diagnosis.issueCount >= 1);
    assert.strictEqual(logger.diagnoseLogContent('plain info line').status, 'pass');

    const oldLog = path.join(logDir, 'app-2000-01-01.log');
    fs.writeFileSync(oldLog, 'old');
    fs.utimesSync(oldLog, new Date('2000-01-01'), new Date('2000-01-01'));
    const cleanup = logger.cleanupOldLogs();
    assert.ok(cleanup.deleted >= 1);
    assert.ok(!fs.existsSync(oldLog));
    const deleted = logger.deleteLogFiles({ names: [recent.files[0].name] });
    assert.strictEqual(deleted.deleted, 1);
    assert.ok(!fs.existsSync(path.join(logDir, recent.files[0].name)));
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
