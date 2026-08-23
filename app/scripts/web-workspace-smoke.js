const { readFile } = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');

const siteWorkerPath = path.resolve(__dirname, '../../site/dist/server/index.js');
const host = '127.0.0.1';

async function createSiteServer() {
  const source = await readFile(siteWorkerPath, 'utf8');
  const workerUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const worker = (await import(workerUrl)).default;
  const server = http.createServer(async (request, response) => {
    try {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const target = new URL(request.url || '/', `http://${host}:${port}`);
      const siteResponse = await worker.fetch(new Request(target, {
        method: request.method || 'GET'
      }));
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

async function waitForRuntime(window) {
  await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      if (document.documentElement.dataset.runtimeStatus === 'ready') return resolve(true);
      if (document.documentElement.dataset.runtimeStatus === 'failed') return reject(new Error('Legacy runtime failed.'));
      if (Date.now() - startedAt > 15000) return reject(new Error('Web workspace runtime timed out.'));
      setTimeout(poll, 50);
    };
    poll();
  })`, true);
}

async function run() {
  app.disableHardwareAcceleration();
  await app.whenReady();
  const { server, url } = await createSiteServer();
  const partition = `web-workspace-smoke-${Date.now()}`;
  const isolatedSession = session.fromPartition(partition, { cache: false });
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
    await window.loadURL(url);
    await waitForRuntime(window);
    const result = await window.webContents.executeJavaScript(`(async () => {
      const projectDir = 'web://project/web-workspace-smoke';
      const saved = await window.platformAdapter.project.save({
        projectDir,
        settings: { projectName: 'Web workspace smoke' },
        zones: [{ id: 'zone-smoke', name: 'Smoke Zone' }],
        points: [{ id: 'point-smoke', zoneId: 'zone-smoke', plantNameSci: 'Planta test' }]
      });
      const backup = await window.platformAdapter.backup.create({ projectDir, label: 'smoke' });
      const changed = await window.platformAdapter.project.save({
        projectDir,
        settings: { projectName: 'Changed after backup' },
        zones: [{ id: 'zone-smoke', name: 'Smoke Zone' }],
        points: [{ id: 'point-smoke', zoneId: 'zone-smoke', plantNameSci: 'Planta test' }]
      });
      const restored = backup.ok
        ? await window.platformAdapter.backup.restore({
          projectDir,
          backupName: backup.data.name,
          confirmRestore: true
        })
        : { ok: false };
      const loaded = await window.platformAdapter.project.load({ projectDir });
      const logged = await window.platformAdapter.log.report({
        level: 'info',
        scope: 'web-workspace-smoke',
        message: 'Web workspace platform services verified'
      });
      const logs = await window.platformAdapter.log.listRecent({ limit: 10 });
      const storage = await window.platformAdapter.storage.conversionPreflight({ projectDir });
      return {
        runtime: window.platformAdapter.runtime,
        readOnly: window.platformAdapter.capabilities.readOnly,
        writeProject: window.platformAdapter.capabilities.writeProject,
        storageMode: loaded.ok ? loaded.data.webStorageMode : '',
        zoneCount: loaded.ok ? loaded.data.zones.length : -1,
        pointCount: loaded.ok ? loaded.data.points.length : -1,
        saved: saved.ok,
        changed: changed.ok,
        backupCreated: backup.ok,
        backupRestored: restored.ok,
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
        mapReady: Boolean(window.__CQNU_STATE__?.map),
        runtimeStatus: document.documentElement.dataset.runtimeStatus,
        siteHomeLink: Boolean(document.querySelector('.web-site-link[href="/"]'))
      };
    })()`, true);

    const failures = [];
    if (result.runtime !== 'web') failures.push(`runtime: ${result.runtime}`);
    if (result.readOnly) failures.push('web adapter is still read-only');
    if (!result.writeProject || !result.saved) failures.push(`web project save is unavailable: ${result.saveError}`);
    if (!result.changed || !result.backupCreated || !result.backupRestored) {
      failures.push(`web backup create/restore is unavailable: ${result.backupError || result.restoreError}`);
    }
    if (result.restoredProjectName !== 'Web workspace smoke') {
      failures.push(`backup restore value: ${result.restoredProjectName}`);
    }
    if (!result.logged || result.logCount < 1) failures.push(`web diagnostic log round trip failed: ${result.logError}`);
    if (!result.storageReady) failures.push(`web storage preflight failed: ${result.storageError || result.loadError}`);
    if (!result.backupCapability || !result.diagnosticsCapability || !result.speciesCapability) {
      failures.push('web platform capabilities are incomplete');
    }
    if (result.storageMode !== 'opfs-sahpool') failures.push(`storage mode: ${result.storageMode}`);
    if (result.zoneCount !== 1 || result.pointCount !== 1) {
      failures.push(`project round trip: ${result.zoneCount} zones / ${result.pointCount} points`);
    }
    if (!result.mapReady) failures.push('Leaflet map did not initialize');
    if (result.runtimeStatus !== 'ready') failures.push(`runtime status: ${result.runtimeStatus}`);
    if (!result.siteHomeLink) failures.push('site homepage link is missing');
    failures.push(...errors.filter(message => !message.includes('Failed to load resource')));
    if (failures.length) throw new Error(failures.join('\n'));
    process.stdout.write('web workspace smoke passed (OPFS SQLite, backup, log, and capability contracts)\n');
  } finally {
    window.destroy();
    await isolatedSession.clearStorageData();
    await new Promise(resolve => server.close(resolve));
  }
}

run()
  .then(() => app.quit())
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    app.exit(1);
  });
