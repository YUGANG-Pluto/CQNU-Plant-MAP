const http = require('node:http');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, session } = require('electron');

const siteRuntimePath = path.resolve(__dirname, '../../site/scripts/local-runtime.mjs');
const host = '127.0.0.1';
let activeSmokeStage = 'startup';

function markSmokeStage(stage) {
  activeSmokeStage = stage;
  if (process.env.CQNU_SMOKE_TRACE === '1') {
    process.stdout.write(`[smoke] ${stage}\n`);
  }
}

function managementSessionFixture(accessLevel = 'save') {
  const absoluteExpiresAt = new Date(Date.now() + (60 * 60 * 1000)).toISOString();
  const capabilities = accessLevel === 'read'
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
  const server = http.createServer(async (request, response) => {
    try {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      const target = new URL(request.url || '/', `http://${host}:${port}`);
      const cookies = String(request.headers.cookie || '');
      const loggedOut = cookies.includes('smoke-login=logged-out');
      const accessLevel = cookies.includes('smoke-access=read') ? 'read' : 'save';
      if (target.pathname === '/api/manage/login' && request.method === 'POST') {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'set-cookie': 'smoke-login=active; Path=/; HttpOnly; SameSite=Strict'
        });
        response.end(JSON.stringify(managementSessionFixture(accessLevel)));
        return;
      }
      if (target.pathname === '/api/manage/session'
        || target.pathname === '/api/manage/session/heartbeat') {
        if (loggedOut) {
          response.writeHead(401, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store'
          });
          response.end(JSON.stringify({ ok: false, error: { code: 'SESSION_REQUIRED', message: '登录会话已失效，请重新登录。' } }));
          return;
        }
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        });
        response.end(JSON.stringify(managementSessionFixture(accessLevel)));
        return;
      }
      const siteResponse = await worker.fetch(
        new Request(target, { method: request.method || 'GET' }),
        env
      );
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

function waitForPathname(window, expectedPathname, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      window.webContents.removeListener('did-navigate', handleNavigation);
    };
    const matches = () => {
      try {
        return new URL(window.webContents.getURL()).pathname === expectedPathname;
      } catch {
        return false;
      }
    };
    const handleNavigation = () => {
      if (!matches()) return;
      cleanup();
      resolve(true);
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Navigation to ${expectedPathname} timed out.`));
    }, timeoutMs);
    if (matches()) {
      cleanup();
      resolve(true);
      return;
    }
    window.webContents.on('did-navigate', handleNavigation);
  });
}

function collectWindowErrors(window, errors, scope) {
  window.webContents.on('console-message', details => {
    if (Number(details?.level || 0) >= 3) {
      errors.push(`${scope}:${details?.lineNumber || 0} ${details?.message || ''}`);
    }
  });
}

async function captureSmokeScreenshot(window, name) {
  const outputDirectory = process.env.CQNU_SMOKE_SCREENSHOT_DIR;
  if (!outputDirectory) return;
  const originalBounds = window.getBounds();
  window.setSkipTaskbar(true);
  window.setBounds({ ...originalBounds, x: -32_000, y: -32_000 }, false);
  window.showInactive();
  await new Promise(resolve => setTimeout(resolve, 820));
  await window.webContents.executeJavaScript(`new Promise(resolve => {
    for (const animation of document.getAnimations()) {
      try { animation.finish(); } catch {}
    }
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`, true);
  window.webContents.invalidate();
  await new Promise(resolve => setTimeout(resolve, 120));
  await mkdir(outputDirectory, { recursive: true });
  const image = await window.webContents.capturePage();
  await writeFile(path.join(outputDirectory, `${name}.png`), image.toPNG());
  window.hide();
}

async function runReadOnlyDirectoryPickerSmoke(baseUrl) {
  markSmokeStage('read-picker:create-window');
  const partition = `web-read-picker-smoke-${Date.now()}`;
  const isolatedSession = session.fromPartition(partition, { cache: false });
  const origin = new URL(baseUrl).origin;
  await isolatedSession.cookies.set({ url: origin, name: 'smoke-access', value: 'read', path: '/' });
  const errors = [];
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 960,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      session: isolatedSession
    }
  });
  collectWindowErrors(window, errors, 'read-picker');
  try {
    markSmokeStage('read-picker:load-workspace');
    await window.loadURL(`${origin}/workspace`);
    await waitForRuntime(window);
    markSmokeStage('read-picker:install-fixture');
    const buttonRect = await window.webContents.executeJavaScript(`(() => {
      const now = Date.now();
      const jsonFile = (name, value) => new File(
        [JSON.stringify(value)],
        name,
        { type: 'application/json', lastModified: now }
      );
      const files = new Map([
        ['settings.json', jsonFile('settings.json', { projectName: 'Read user directory smoke' })],
        ['zones.json', jsonFile('zones.json', [{ id: 'zone-read', name: '只读测试分区' }])],
        ['points.json', jsonFile('points.json', [{ id: 'point-read', zoneRef: 'zone-read', plantNameCn: '烟测植物' }])]
      ]);
      const information = {
        name: 'information',
        async getFileHandle(name) {
          const file = files.get(name);
          if (!file) throw new DOMException('Not found', 'NotFoundError');
          return { getFile: async () => file };
        }
      };
      const permissionModes = [];
      const handle = {
        name: 'Read user project',
        async isSameEntry(other) { return other === this; },
        async queryPermission(descriptor) {
          permissionModes.push(descriptor.mode);
          return descriptor.mode === 'read' ? 'granted' : 'denied';
        },
        async requestPermission(descriptor) {
          permissionModes.push(descriptor.mode);
          return descriptor.mode === 'read' ? 'granted' : 'denied';
        },
        async getDirectoryHandle(name) {
          if (name === 'information') return information;
          throw new DOMException('Not found', 'NotFoundError');
        }
      };
      window.__readPickerSmoke = {
        called: false,
        thisBound: false,
        userActivation: false,
        mode: '',
        permissionModes,
        loaded: false
      };
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        value: function(options) {
          window.__readPickerSmoke.called = true;
          window.__readPickerSmoke.thisBound = this === window;
          window.__readPickerSmoke.userActivation = navigator.userActivation?.isActive === true;
          window.__readPickerSmoke.mode = options?.mode || '';
          return Promise.resolve(handle);
        }
      });
      window.addEventListener('cqnu:project-loaded', () => {
        window.__readPickerSmoke.loaded = true;
      }, { once: true });
      const button = document.getElementById('btnChooseDir');
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, disabled: button.disabled };
    })()`, true);
    if (buttonRect.disabled) throw new Error('read account project button is disabled');
    markSmokeStage('read-picker:trusted-click');
    window.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(buttonRect.x), y: Math.round(buttonRect.y) });
    window.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(buttonRect.x), y: Math.round(buttonRect.y), button: 'left', clickCount: 1 });
    window.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(buttonRect.x), y: Math.round(buttonRect.y), button: 'left', clickCount: 1 });
    markSmokeStage('read-picker:await-project');
    const result = await window.webContents.executeJavaScript(`new Promise(resolve => {
      const startedAt = Date.now();
      const poll = () => {
        if (window.__readPickerSmoke.loaded || Date.now() - startedAt > 8000) {
          const commandButton = document.getElementById('btnOpenCommandPalette');
          commandButton?.click();
          setTimeout(() => {
            const layer = document.getElementById('commandPaletteModal');
            const closeButton = layer?.querySelector('#btnCloseCommandPalette, [aria-label="关闭"], .modal-close');
            const rect = closeButton?.getBoundingClientRect();
            const hit = rect ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
            const layerZ = Number.parseInt(getComputedStyle(layer).zIndex, 10);
            const topbarZ = Number.parseInt(getComputedStyle(document.querySelector('.app-topbar')).zIndex, 10);
            resolve({
              ...window.__readPickerSmoke,
              projectLoaded: document.documentElement.dataset.projectLoaded === 'true',
              pointCount: window.__CQNU_STATE__?.points?.length ?? -1,
              readOnly: window.platformAdapter.capabilities.readOnly,
              writeProject: window.platformAdapter.capabilities.writeProject,
              layerZ: Number.isFinite(layerZ) ? layerZ : 0,
              topbarZ: Number.isFinite(topbarZ) ? topbarZ : 0,
              layerHidden: layer?.classList.contains('hidden'),
              layerAriaHidden: layer?.getAttribute('aria-hidden'),
              closeRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
              hitTarget: hit
                ? hit.tagName.toLowerCase() + '#' + hit.id + '.' + (hit.className?.baseVal || hit.className || '')
                : '',
              openLayers: [...document.querySelectorAll('.layer-modal:not(.hidden)')].map(item => item.id),
              openLayerDetails: [...document.querySelectorAll('.layer-modal:not(.hidden)')].map(item => ({
                id: item.id,
                z: getComputedStyle(item).zIndex,
                text: (item.querySelector('h2, [role="alert"], .modal-message')?.textContent || item.textContent || '')
                  .trim()
                  .replace(/\s+/g, ' ')
                  .slice(0, 220)
              })),
              closeHitVisible: Boolean(closeButton && (hit === closeButton || closeButton.contains(hit)))
            });
          }, 720);
          return;
        }
        setTimeout(poll, 40);
      };
      poll();
    })`, true);
    const failures = [];
    if (!result.called || !result.thisBound) failures.push('directory picker was not called with the Window receiver');
    if (!result.userActivation) failures.push('directory picker lost trusted user activation');
    if (result.mode !== 'read' || result.permissionModes.some(mode => mode !== 'read')) {
      failures.push(`read account requested invalid modes: ${result.mode} / ${result.permissionModes.join(',')}`);
    }
    if (!result.loaded || !result.projectLoaded || result.pointCount !== 1) {
      failures.push(`read account project load failed: ${result.loaded} / ${result.projectLoaded} / ${result.pointCount}`);
    }
    if (!result.readOnly || result.writeProject) failures.push('read account received write capabilities');
    if (result.layerZ <= result.topbarZ || !result.closeHitVisible) {
      failures.push(`top-layer contract failed: ${JSON.stringify({
        layerZ: result.layerZ,
        topbarZ: result.topbarZ,
        closeHitVisible: result.closeHitVisible,
        layerHidden: result.layerHidden,
        layerAriaHidden: result.layerAriaHidden,
        closeRect: result.closeRect,
        hitTarget: result.hitTarget,
        openLayers: result.openLayers,
        openLayerDetails: result.openLayerDetails
      })}`);
    }
    failures.push(...errors);
    if (failures.length) throw new Error(failures.join('\n'));
    markSmokeStage('read-picker:complete');
    return result;
  } finally {
    markSmokeStage('read-picker:cleanup');
    window.destroy();
    await isolatedSession.clearStorageData();
  }
}

async function runManagementUiSmoke(baseUrl) {
  markSmokeStage('management:create-window');
  const partition = `management-ui-smoke-${Date.now()}`;
  const isolatedSession = session.fromPartition(partition, { cache: false });
  const origin = new URL(baseUrl).origin;
  await isolatedSession.cookies.set({ url: origin, name: 'smoke-login', value: 'logged-out', path: '/' });
  const errors = [];
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 960,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      session: isolatedSession
    }
  });
  collectWindowErrors(window, errors, 'management-ui');
  try {
    markSmokeStage('management:load-login');
    await window.loadURL(`${origin}/manage`);
    await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const poll = () => {
        const form = document.querySelector('[data-login-form]');
        if (form && !form.hidden) return resolve(true);
        if (Date.now() - startedAt > 8000) return reject(new Error('Login form timed out.'));
        setTimeout(poll, 40);
      };
      poll();
    })`, true);
    markSmokeStage('management:submit-login');
    const workspaceNavigation = waitForPathname(window, '/workspace');
    await window.webContents.executeJavaScript(`(() => {
      const form = document.querySelector('[data-login-form]');
      form.elements.username.value = 'web.smoke';
      form.elements.password.value = 'Smoke9!';
      form.requestSubmit();
      return true;
    })()`, true);
    await workspaceNavigation;
    await waitForRuntime(window);
    const redirectedToWorkspace = new URL(window.webContents.getURL()).pathname === '/workspace';

    markSmokeStage('management:open-account');
    await window.loadURL(`${origin}/manage?next=/manage&view=account`);
    const accountReady = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const poll = () => {
        const view = document.querySelector('[data-view="account"]');
        if (view && !view.hidden) return resolve(true);
        if (Date.now() - startedAt > 8000) return reject(new Error('Account view timed out.'));
        setTimeout(poll, 40);
      };
      poll();
    })`, true);
    markSmokeStage('management:upload-avatar');
    const avatarResult = await window.webContents.executeJavaScript(`(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      context.fillStyle = '#167A70';
      context.fillRect(0, 0, 64, 64);
      context.fillStyle = '#ffffff';
      context.font = 'bold 30px sans-serif';
      context.fillText('C', 21, 43);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector('[data-avatar-input]');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const poll = () => {
          const value = window.cqnuLocalProfile?.read('acct_web_smoke_save') || '';
          if (value) return resolve();
          const message = document.querySelector('[data-avatar-message]')?.textContent || '';
          if (message) return reject(new Error(message));
          if (Date.now() - startedAt > 8000) return reject(new Error('Avatar upload timed out.'));
          setTimeout(poll, 40);
        };
        poll();
      });
      return {
        stored: Boolean(window.cqnuLocalProfile?.read('acct_web_smoke_save')),
        previewVisible: !document.querySelector('[data-avatar-preview-image]').hidden
      };
    })()`, true);
    await captureSmokeScreenshot(window, 'management-account');
    markSmokeStage('management:verify-workspace-avatar');
    await window.loadURL(`${origin}/workspace`);
    await waitForRuntime(window);
    const workspaceAvatarVisible = await window.webContents.executeJavaScript(
      `Boolean(document.querySelector('.web-profile-avatar img')?.getAttribute('src')?.startsWith('data:image/'))`,
      true
    );
    await captureSmokeScreenshot(window, 'workspace');
    const failures = [];
    if (!redirectedToWorkspace) failures.push('login did not route directly to workspace');
    if (!accountReady) failures.push('avatar link target did not open account view');
    if (!avatarResult.stored || !avatarResult.previewVisible || !workspaceAvatarVisible) {
      failures.push(`avatar workflow failed: ${JSON.stringify(avatarResult)} / ${workspaceAvatarVisible}`);
    }
    failures.push(...errors);
    if (failures.length) throw new Error(failures.join('\n'));
    markSmokeStage('management:complete');
    return { redirectedToWorkspace, accountReady, ...avatarResult, workspaceAvatarVisible };
  } finally {
    markSmokeStage('management:cleanup');
    window.destroy();
    await isolatedSession.clearStorageData();
  }
}

async function run() {
  markSmokeStage('primary:electron-ready');
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
    const result = await window.webContents.executeJavaScript(`(async () => {
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
    })()`, true);
    if (result.smokeExecutionError) {
      const failure = result.smokeExecutionError;
      throw new Error(`${failure.stage}: ${failure.name}: ${failure.message}\n${failure.stack}`);
    }

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
      lockResult = await secondWindow.webContents.executeJavaScript(`window.platformAdapter.project.save({
        projectDir: 'web://project/web-workspace-smoke-secondary',
        settings: { projectName: 'Secondary tab must not write' },
        zones: [],
        points: []
      })`, true);
    } finally {
      secondWindow.destroy();
    }
    const primaryAfterLock = await window.webContents.executeJavaScript(
      `window.platformAdapter.project.load({ projectDir: 'web://project/web-workspace-smoke' })`,
      true
    );
    await runReadOnlyDirectoryPickerSmoke(url);
    await runManagementUiSmoke(url);
    markSmokeStage('primary:assertions');

    const failures = [];
    if (result.runtime !== 'web') failures.push(`runtime: ${result.runtime}`);
    if (result.readOnly) failures.push('web adapter is still read-only');
    if (!result.writeProject || !result.saved) failures.push(`web project save is unavailable: ${result.saveError}`);
    if (result.directoryPermissionStatus !== 'granted' || result.directoryReconnectRequired) {
      failures.push(`directory handle recovery: ${result.directoryPermissionStatus} / ${result.directoryReconnectRequired}`);
    }
    if (!result.directoryMirrorWritten) {
      failures.push(`recovered directory handle did not receive the JSON mirror: ${result.mirrorWarning || result.mirrorReadError}`);
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
    if (!result.logged || result.logCount < 1) failures.push(`web diagnostic log round trip failed: ${result.logError}`);
    if (!result.storageReady) failures.push(`web storage preflight failed: ${result.storageError || result.loadError}`);
    if (!result.backupCapability || !result.diagnosticsCapability || !result.speciesCapability) {
      failures.push('web platform capabilities are incomplete');
    }
    if (!result.externalBackupCapability || !result.externalBackupApi || !result.externalBackupControls) {
      failures.push('external web backup import contract is incomplete');
    }
    if (!['full', 'portable'].includes(result.capabilityMode) || result.missingCapabilities.length) {
      failures.push(`browser capability assessment: ${result.capabilityMode} / ${result.missingCapabilities.join(', ')}`);
    }
    if (result.storageMode !== 'opfs-sahpool') failures.push(`storage mode: ${result.storageMode}`);
    if (result.zoneCount !== 1 || result.pointCount !== 1) {
      failures.push(`project round trip: ${result.zoneCount} zones / ${result.pointCount} points`);
    }
    if (!result.mapReady) failures.push('Leaflet map did not initialize');
    if (result.runtimeStatus !== 'ready') failures.push(`runtime status: ${result.runtimeStatus}`);
    if (!result.siteHomeLink) failures.push('site homepage link is missing');
    if (lockResult?.ok !== false || lockResult?.error?.code !== 'WEB_DATABASE_LOCKED') {
      failures.push(`secondary tab lock contract: ${JSON.stringify(lockResult)}`);
    }
    if (!String(lockResult?.error?.message || '').includes('工作区标签页')) {
      failures.push(`secondary tab lock message: ${lockResult?.error?.message || ''}`);
    }
    if (!primaryAfterLock?.ok) failures.push('primary tab stopped working after secondary lock rejection');
    failures.push(...errors.filter(message => {
      if (message.includes('Failed to load resource')) return false;
      return !/^net::ERR_ABORTED https:\/\/[abc]\.tile\.openstreetmap\.org\//.test(message);
    }));
    if (failures.length) throw new Error(failures.join('\n'));
    process.stdout.write('web workspace smoke passed (OPFS SQLite, read-user directory picker, login routing, local avatar, top-layer hit test, image backup restore, external ZIP contracts, multi-tab lock, log, and capability matrix)\n');
  } finally {
    markSmokeStage('primary:cleanup-window');
    window.destroy();
    await isolatedSession.clearStorageData();
    markSmokeStage('primary:cleanup-server');
    await new Promise(resolve => server.close(resolve));
    markSmokeStage('primary:complete');
  }
}

const smokeTimeout = setTimeout(() => {
  process.stderr.write(`[${activeSmokeStage}] Web workspace smoke exceeded the 55 second limit.\n`);
  app.exit(1);
}, 55_000);

run()
  .then(() => {
    clearTimeout(smokeTimeout);
    app.quit();
  })
  .catch(error => {
    clearTimeout(smokeTimeout);
    const detail = error instanceof Error
      ? error.stack || error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error, Object.getOwnPropertyNames(error || {}))
          || 'Unknown web workspace smoke failure';
    process.stderr.write(`[${activeSmokeStage}] ${detail}\n`);
    app.exit(1);
  });
