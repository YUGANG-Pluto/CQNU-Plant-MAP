const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, session } = require('electron');
const {
  runManagementUiSmoke,
  runReadOnlyDirectoryPickerSmoke,
  setSmokeStageReporter,
  waitForRuntime
} = require('./web-workspace-ui-smoke');
const {
  createDesktopSqliteFixtureBytes,
  runExternalSqliteImportSmoke,
  runStatsFullscreenLayerSmoke
} = require('./web-workspace-contract-smoke');
const {
  createCloudProjectSmokeApi,
  runCloudProjectRoundtrip
} = require('./web-workspace-cloud-smoke');

const siteRuntimePath = path.resolve(__dirname, '../../site/scripts/local-runtime.mjs');
const host = '127.0.0.1';
let activeSmokeStage = 'startup';

function markSmokeStage(stage) {
  activeSmokeStage = stage;
  if (process.env.CQNU_SMOKE_TRACE === '1') {
    process.stdout.write(`[smoke] ${stage}\n`);
  }
}

setSmokeStageReporter(markSmokeStage);

function managementSessionFixture(accessLevel = 'save') {
  const absoluteExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const capabilities =
    accessLevel === 'read'
      ? ['workspace.read']
      : accessLevel === 'edit'
        ? ['workspace.read', 'workspace.edit']
        : ['workspace.read', 'workspace.edit', 'workspace.save', 'member.read', 'member.manage', 'audit.read'];
  return {
    ok: true,
    data: {
      account: {
        id: `acct_web_smoke_${accessLevel}`,
        username: accessLevel === 'read' ? 'user' : 'web.smoke',
        displayName: accessLevel === 'read' ? 'Read user' : 'Web smoke',
        accountKind: accessLevel === 'save' ? 'admin' : 'user',
        accessLevel,
        status: 'active',
        mustChangePassword: false
      },
      capabilities,
      session: { absoluteExpiresAt },
      csrfToken: 'web-smoke-csrf'
    }
  };
}

async function createSiteServer() {
  const { createLocalSiteRuntime } = await import(pathToFileURL(siteRuntimePath).href);
  const { worker, env } = await createLocalSiteRuntime();
  const cloudProjectApi = createCloudProjectSmokeApi();

  const server = http.createServer(async (request, response) => {
    try {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const target = new URL(request.url || '/', `http://${host}:${port}`);
      const cookies = String(request.headers.cookie || '');
      const loggedOut = cookies.includes('smoke-login=logged-out');
      const accessLevel = cookies.includes('smoke-access=read') ? 'read' : 'save';
      if (await cloudProjectApi.handle(request, response, target, { loggedOut, accessLevel })) return;
      if (target.pathname === '/api/manage/login' && request.method === 'POST') {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'set-cookie': 'smoke-login=active; Path=/; HttpOnly; SameSite=Strict'
        });
        response.end(JSON.stringify(managementSessionFixture(accessLevel)));
        return;
      }
      if (target.pathname === '/api/manage/session' || target.pathname === '/api/manage/session/heartbeat') {
        if (loggedOut) {
          response.writeHead(401, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store'
          });
          response.end(
            JSON.stringify({
              ok: false,
              error: { code: 'SESSION_REQUIRED', message: '登录会话已失效，请重新登录。' }
            })
          );
          return;
        }
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        });
        response.end(JSON.stringify(managementSessionFixture(accessLevel)));
        return;
      }
      const siteResponse = await worker.fetch(new Request(target, { method: request.method || 'GET' }), env);
      response.writeHead(siteResponse.status, Object.fromEntries(siteResponse.headers));
      response.end(Buffer.from(await siteResponse.arrayBuffer()));
    } catch {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Preview failed.');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, url: `http://${host}:${port}/workspace` };
}

async function run() {
  markSmokeStage('primary:electron-ready');
  app.disableHardwareAcceleration();
  await app.whenReady();
  const { server, url } = await createSiteServer();
  const partition = `web-workspace-smoke-${Date.now()}`;
  const isolatedSession = session.fromPartition(partition);
  const errors = [];
  isolatedSession.webRequest.onCompleted(details => {
    if (details.statusCode >= 400) errors.push(`HTTP ${details.statusCode} ${details.url}`);
  });
  isolatedSession.webRequest.onErrorOccurred(details => {
    errors.push(`${details.error || 'network error'} ${details.url}`);
  });
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      session: isolatedSession
    }
  });
  window.webContents.on('console-message', details => {
    if (Number(details?.level || 0) >= 3) {
      errors.push(`${details?.sourceId || 'workspace'}:${details?.lineNumber || 0} ${details?.message || ''}`);
    }
  });

  try {
    markSmokeStage('primary:load-workspace');
    await window.loadURL(url);
    await waitForRuntime(window);
    markSmokeStage('primary:platform-roundtrip');
    const result = await window.webContents.executeJavaScript(
      `(async () => {
      let browserStage = 'initialize';
      try {
      const projectDir = 'web://project/web-workspace-smoke';
      const imageReference = '/_cqnu-local-image/web-workspace-smoke/smoke/image.txt';
      browserStage = 'seed-image-cache';
      const imageRequest = new Request(new URL(imageReference, window.location.origin).href);
      const imageCache = await caches.open('cqnu-plant-map-web-images-v1');
      await imageCache.put(imageRequest, new Response(new Blob(['smoke-image-bytes'], {
        type: 'application/octet-stream'
      }), {
        headers: { 'x-cqnu-file-name': encodeURIComponent('smoke-image.bin') }
      }));
      browserStage = 'save-project';
      const saved = await window.platformAdapter.project.save({
        projectDir,
        settings: { projectName: 'Web workspace smoke' },
        zones: [{ id: 'zone-smoke', name: 'Smoke Zone' }],
        points: [{
          id: 'point-smoke',
          zoneId: 'zone-smoke',
          plantNameSci: 'Planta test',
          images: [imageReference]
        }]
      });
      browserStage = 'open-opfs';
      const opfsRoot = await navigator.storage.getDirectory();
      browserStage = 'persist-directory-handle';
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('cqnu-plant-map-web-handles', 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('directories')) {
            request.result.createObjectStore('directories', { keyPath: 'projectId' });
          }
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('directories', 'readwrite');
          transaction.objectStore('directories').put({
            projectId: 'web-workspace-smoke',
            name: 'OPFS smoke mirror',
            handle: opfsRoot,
            updatedAt: Date.now()
          });
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      });
      browserStage = 'recover-directory-handle';
      const recoveredDirectory = await window.platformAdapter.project.load({ projectDir });
      browserStage = 'create-backup';
      const backup = await window.platformAdapter.backup.create({ projectDir, label: 'smoke' });
      const inspected = backup.ok
        ? await window.platformAdapter.backup.inspectRestore({ projectDir, backupName: backup.data.name })
        : { ok: false };
      browserStage = 'change-project';
      await imageCache.delete(imageRequest);
      const changed = await window.platformAdapter.project.save({
        projectDir,
        settings: { projectName: 'Changed after backup' },
        zones: [{ id: 'zone-smoke', name: 'Smoke Zone' }],
        points: [{
          id: 'point-smoke',
          zoneId: 'zone-smoke',
          plantNameSci: 'Planta test',
          images: [imageReference]
        }]
      });
      browserStage = 'restore-backup';
      const restored = backup.ok
        ? await window.platformAdapter.backup.restore({
          projectDir,
          backupName: backup.data.name,
          confirmRestore: true
        })
        : { ok: false };
      browserStage = 'load-restored-project';
      const loaded = await window.platformAdapter.project.load({ projectDir });
      browserStage = 'read-json-mirror';
      let mirrorSettingsSize = 0;
      let mirrorReadError = '';
      try {
        const mirrorInformation = await opfsRoot.getDirectoryHandle('information');
        const mirrorSettings = await mirrorInformation.getFileHandle('settings.json').then(handle => handle.getFile());
        mirrorSettingsSize = mirrorSettings.size;
      } catch (error) {
        mirrorReadError = String(error?.name || 'Error')
          + ': '
          + String(error?.message || error || 'unknown mirror error');
      }
      const restoredImage = await imageCache.match(imageRequest);
      const restoredImageText = restoredImage ? await restoredImage.text() : '';
      browserStage = 'diagnostics';
      const logged = await window.platformAdapter.log.report({
        level: 'info',
        scope: 'web-workspace-smoke',
        message: 'Web workspace platform services verified'
      });
      const logs = await window.platformAdapter.log.listRecent({ limit: 10 });
      const storage = await window.platformAdapter.storage.conversionPreflight({ projectDir });
      browserStage = 'collect-result';
      return {
        runtime: window.platformAdapter.runtime,
        readOnly: window.platformAdapter.capabilities.readOnly,
        writeProject: window.platformAdapter.capabilities.writeProject,
        directoryPermissionStatus: recoveredDirectory.ok
          ? recoveredDirectory.data.webDirectoryPermissionStatus
          : '',
        directoryReconnectRequired: recoveredDirectory.ok
          ? recoveredDirectory.data.webDirectoryReconnectRequired
          : true,
        directoryMirrorWritten: mirrorSettingsSize > 0,
        mirrorReadError,
        mirrorWarning: changed.ok ? String(changed.data.mirrorWarning || '') : '',
        storageMode: loaded.ok ? loaded.data.webStorageMode : '',
        zoneCount: loaded.ok ? loaded.data.zones.length : -1,
        pointCount: loaded.ok ? loaded.data.points.length : -1,
        saved: saved.ok,
        changed: changed.ok,
        backupCreated: backup.ok,
        backupImageCount: backup.ok ? backup.data.imageCount : -1,
        inspectedImageCount: inspected.ok ? inspected.data.imageCount : -1,
        backupRestored: restored.ok,
        restoredImageCount: restored.ok ? restored.data.restoredImageCount : -1,
        restoredImageText,
        restoredProjectName: loaded.ok ? loaded.data.settings.projectName : '',
        saveError: saved.ok ? '' : saved.error.message.slice(0, 400),
        backupError: backup.ok ? '' : backup.error.message.slice(0, 400),
        restoreError: restored.ok ? '' : (restored.error?.message || 'restore skipped').slice(0, 400),
        loadError: loaded.ok ? '' : loaded.error.message.slice(0, 400),
        logError: logged.ok ? '' : logged.error.message.slice(0, 400),
        storageError: storage.ok ? '' : storage.error.message.slice(0, 400),
        logged: logged.ok,
        logCount: logs.ok ? logs.data.entries.length : 0,
        storageReady: storage.ok && storage.data.databaseExists,
        backupCapability: window.platformAdapter.capabilities.backups,
        diagnosticsCapability: window.platformAdapter.capabilities.diagnostics,
        speciesCapability: window.platformAdapter.capabilities.speciesReference,
        externalBackupCapability: window.platformAdapter.capabilities.externalBackupImport,
        capabilityMode: window.platformAdapter.web?.capabilityReport?.mode || '',
        missingCapabilities: window.platformAdapter.web?.capabilityReport?.missingRequired || [],
        externalBackupApi: typeof window.platformAdapter.backup.importArchive === 'function'
          && typeof window.platformAdapter.backup.restoreImported === 'function',
        externalBackupControls: Boolean(document.getElementById('btnImportExternalBackup'))
          && Boolean(document.getElementById('btnRestoreImportedBackup')),
        projectWorkflowReady: window.projectWorkflow?.version === 'project-workflow-v1'
          && document.documentElement.dataset.projectWorkflow === 'project-workflow-v1'
          && Object.isFrozen(window.projectWorkflow)
          && Object.isFrozen(window.projectWorkflow?.getStatus())
          && window.projectWorkflow?.getStatus().busy === false
          && ['chooseAndLoad', 'load', 'save', 'createBackup', 'inspectBackup', 'restoreBackup']
            .every(name => typeof window.projectWorkflow?.[name] === 'function'),
        mapReady: Boolean(window.__CQNU_STATE__?.map),
        runtimeStatus: document.documentElement.dataset.runtimeStatus,
        siteHomeLink: Boolean(document.querySelector('.web-site-link[href="/"]'))
      };
      } catch (error) {
        return {
          smokeExecutionError: {
            stage: browserStage,
            name: String(error?.name || 'Error'),
            message: String(error?.message || error || 'Unknown browser error'),
            stack: String(error?.stack || '')
          }
        };
      }
    })()`,
      true
    );
    if (result.smokeExecutionError) {
      const failure = result.smokeExecutionError;
      throw new Error(`${failure.stage}: ${failure.name}: ${failure.message}\n${failure.stack}`);
    }

    markSmokeStage('primary:cloud-project-roundtrip');
    const cloudResult = await runCloudProjectRoundtrip(window);

    markSmokeStage('primary:external-sqlite-import');
    const externalSqliteResult = await runExternalSqliteImportSmoke(window, createDesktopSqliteFixtureBytes());

    markSmokeStage('primary:stats-fullscreen-layer');
    const statsFullscreenResult = await runStatsFullscreenLayerSmoke(window);

    markSmokeStage('primary:multi-tab-lock');
    const secondWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        backgroundThrottling: false,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        session: isolatedSession
      }
    });
    let lockResult;
    try {
      await secondWindow.loadURL(url);
      await waitForRuntime(secondWindow);
      lockResult = await secondWindow.webContents.executeJavaScript(
        `window.platformAdapter.project.save({
        projectDir: 'web://project/web-workspace-smoke-secondary',
        settings: { projectName: 'Secondary tab must not write' },
        zones: [],
        points: []
      })`,
        true
      );
    } finally {
      secondWindow.destroy();
    }
    const primaryAfterLock = await window.webContents.executeJavaScript(
      `window.platformAdapter.project.load({ projectDir: 'web://project/web-workspace-smoke' })`,
      true
    );
    await runReadOnlyDirectoryPickerSmoke(url);
    const managementResult = await runManagementUiSmoke(url);
    markSmokeStage('primary:assertions');

    const failures = [];
    if (result.runtime !== 'web') failures.push(`runtime: ${result.runtime}`);
    if (result.readOnly) failures.push('web adapter is still read-only');
    if (!result.writeProject || !result.saved) failures.push(`web project save is unavailable: ${result.saveError}`);
    if (result.directoryPermissionStatus !== 'granted' || result.directoryReconnectRequired) {
      failures.push(
        `directory handle recovery: ${result.directoryPermissionStatus} / ${result.directoryReconnectRequired}`
      );
    }
    if (!result.directoryMirrorWritten) {
      failures.push(
        `recovered directory handle did not receive the JSON mirror: ${result.mirrorWarning || result.mirrorReadError}`
      );
    }
    if (!result.changed || !result.backupCreated || !result.backupRestored) {
      failures.push(`web backup create/restore is unavailable: ${result.backupError || result.restoreError}`);
    }
    if (result.backupImageCount !== 1 || result.inspectedImageCount !== 1) {
      failures.push(`web backup image capture: ${result.backupImageCount} / ${result.inspectedImageCount}`);
    }
    if (result.restoredImageCount !== 1 || result.restoredImageText !== 'smoke-image-bytes') {
      failures.push(`web backup image restore: ${result.restoredImageCount} / ${result.restoredImageText}`);
    }
    if (result.restoredProjectName !== 'Web workspace smoke') {
      failures.push(`backup restore value: ${result.restoredProjectName}`);
    }
    if (!result.logged || result.logCount < 1)
      failures.push(`web diagnostic log round trip failed: ${result.logError}`);
    if (!result.storageReady) failures.push(`web storage preflight failed: ${result.storageError || result.loadError}`);
    if (!result.backupCapability || !result.diagnosticsCapability || !result.speciesCapability) {
      failures.push('web platform capabilities are incomplete');
    }
    if (!result.externalBackupCapability || !result.externalBackupApi || !result.externalBackupControls) {
      failures.push('external web backup import contract is incomplete');
    }
    if (!['full', 'portable'].includes(result.capabilityMode) || result.missingCapabilities.length) {
      failures.push(
        `browser capability assessment: ${result.capabilityMode} / ${result.missingCapabilities.join(', ')}`
      );
    }
    if (result.storageMode !== 'opfs-sahpool') failures.push(`storage mode: ${result.storageMode}`);
    if (result.zoneCount !== 1 || result.pointCount !== 1) {
      failures.push(`project round trip: ${result.zoneCount} zones / ${result.pointCount} points`);
    }
    if (!result.mapReady) failures.push('Leaflet map did not initialize');
    if (!result.projectWorkflowReady) failures.push('typed project workflow bridge is unavailable in the web runtime');
    if (!cloudResult.clientReady || cloudResult.listed < 1 || cloudResult.savedRevision !== 2) {
      failures.push(`cloud project API round trip: ${JSON.stringify(cloudResult)}`);
    }
    if (cloudResult.sourceKind !== 'cloud' || cloudResult.pointCount !== 1) {
      failures.push(`cloud project working copy: ${cloudResult.sourceKind} / ${cloudResult.pointCount}`);
    }
    if (!cloudResult.sensitiveDataRemoved || !cloudResult.relativeImageReferencePreserved) {
      failures.push(`cloud project sanitizer: ${JSON.stringify(cloudResult)}`);
    }
    if (!cloudResult.libraryOpen || cloudResult.libraryCards < 1) {
      failures.push(`cloud project library UI: ${cloudResult.libraryOpen} / ${cloudResult.libraryCards}`);
    }
    if (result.runtimeStatus !== 'ready') failures.push(`runtime status: ${result.runtimeStatus}`);
    if (!result.siteHomeLink) failures.push('site homepage link is missing');
    if (
      !externalSqliteResult.ok ||
      !externalSqliteResult.filePickerCalled ||
      externalSqliteResult.filePickerMultiple !== false ||
      !externalSqliteResult.externalSqliteImported ||
      !externalSqliteResult.sourceUnchangedFlag ||
      !externalSqliteResult.sourceHashUnchanged ||
      externalSqliteResult.writeAttempted ||
      externalSqliteResult.jsonFilesExist ||
      !externalSqliteResult.saved ||
      externalSqliteResult.zoneCount !== 1 ||
      externalSqliteResult.pointCount !== 1 ||
      externalSqliteResult.unknownZone !== 1 ||
      externalSqliteResult.unknownPoint !== true ||
      externalSqliteResult.phenology !== '开花' ||
      externalSqliteResult.taxonomyProvider !== 'GBIF'
    ) {
      failures.push(`external SQLite import contract: ${JSON.stringify(externalSqliteResult)}`);
    }
    if (
      !statsFullscreenResult.ok ||
      !statsFullscreenResult.mountedToBody ||
      !statsFullscreenResult.visible ||
      statsFullscreenResult.layerZ <= statsFullscreenResult.statsModalZ ||
      !statsFullscreenResult.closeHitVisible ||
      !statsFullscreenResult.bodyLocked ||
      !statsFullscreenResult.closedByEscape ||
      !statsFullscreenResult.statsModalStillVisible ||
      !statsFullscreenResult.statsModalClosed
    ) {
      failures.push(`statistics fullscreen layer contract: ${JSON.stringify(statsFullscreenResult)}`);
    }
    if (lockResult?.ok !== false || lockResult?.error?.code !== 'WEB_DATABASE_LOCKED') {
      failures.push(`secondary tab lock contract: ${JSON.stringify(lockResult)}`);
    }
    if (!String(lockResult?.error?.message || '').includes('工作区标签页')) {
      failures.push(`secondary tab lock message: ${lockResult?.error?.message || ''}`);
    }
    if (!primaryAfterLock?.ok) failures.push('primary tab stopped working after secondary lock rejection');
    failures.push(
      ...errors.filter(message => {
        if (message.includes('Failed to load resource')) return false;
        return !/^net::ERR_ABORTED https:\/\/[abc]\.tile\.openstreetmap\.org\//.test(message);
      })
    );
    if (failures.length) throw new Error(failures.join('\n'));
    process.stdout.write(
      `web workspace smoke passed (login-to-workspace ${managementResult.loginReadyMs}ms; typed import center, OPFS SQLite, direct read-only SQLite picker, lazy SQLite worker, trusted directory picker, local avatar, modal and statistics-fullscreen top-layer hit tests, image backup restore, external ZIP contracts, multi-tab lock, log, and capability matrix)\n`
    );
  } finally {
    markSmokeStage('primary:cleanup-window');
    window.destroy();
    await isolatedSession.clearStorageData();
    markSmokeStage('primary:cleanup-server');
    await new Promise(resolve => server.close(resolve));
    markSmokeStage('primary:complete');
  }
}

const directEntryPath = path.resolve(process.argv[1] || '');
const isDirectExecution = require.main === module || directEntryPath === __filename;

if (isDirectExecution) {
  const smokeTimeoutMs = 55_000;
  const smokeTimeout = setTimeout(() => {
    process.stderr.write(
      `[${activeSmokeStage}] Web workspace smoke exceeded the ${Math.round(smokeTimeoutMs / 1000)} second limit.\n`
    );
    app.exit(1);
  }, smokeTimeoutMs);
  run()
    .then(() => {
      clearTimeout(smokeTimeout);
      app.quit();
    })
    .catch(error => {
      clearTimeout(smokeTimeout);
      const detail =
        error instanceof Error
          ? error.stack || error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error, Object.getOwnPropertyNames(error || {})) || 'Unknown web workspace smoke failure';
      process.stderr.write(`[${activeSmokeStage}] ${detail}\n`);
      app.exit(1);
    });
}

module.exports = {
  createSiteServer,
  managementSessionFixture
};
