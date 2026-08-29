const { BrowserWindow, session } = require('electron');
const {
  captureSmokeScreenshot,
  collectWindowErrors,
  markSmokeStage,
  setSmokeStageReporter,
  verifyManagementSecurityDialogs,
  waitForPathname,
  waitForRuntime
} = require('./web-workspace-ui-support');

async function runReadOnlyDirectoryPickerSmoke(baseUrl) {
  markSmokeStage('read-picker:create-window');
  const partition = `web-read-picker-smoke-${Date.now()}`;
  const isolatedSession = session.fromPartition(partition);
  const origin = new URL(baseUrl).origin;
  await isolatedSession.cookies.set({
    url: origin,
    name: 'smoke-access',
    value: 'read',
    path: '/'
  });
  const errors = [];
  const requestedPaths = [];
  isolatedSession.webRequest.onCompleted(details => {
    try {
      requestedPaths.push(new URL(details.url).pathname);
    } catch {
      return;
    }
  });
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
    const workerRequestsBeforeSelection = requestedPaths.filter(value =>
      /webDatabaseWorker|sqlite3-worker/i.test(value)
    );
    markSmokeStage('read-picker:install-fixture');
    const buttonRect = await window.webContents.executeJavaScript(
      `(() => {
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
        },
        async getFileHandle() {
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
      const button = document.getElementById('btnChooseDirWelcome');
      if (!button) throw new Error('Primary welcome directory button is missing.');
      const rect = button.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        disabled: button.disabled,
        readProject: window.platformAdapter?.capabilities?.readProject === true,
        accessLevel: window.platformAdapter?.web?.managementAccess?.accessLevel || '',
        capabilityMode: window.platformAdapter?.web?.capabilityReport?.mode || '',
        workspaceReady: window.platformAdapter?.web?.capabilityReport?.workspaceReady === true,
        missingRequired: window.platformAdapter?.web?.capabilityReport?.missingRequired || [],
        workspaceSession: document.documentElement.dataset.workspaceSession || ''
      };
    })()`,
      true
    );
    if (buttonRect.disabled) {
      throw new Error(`read account project button is disabled: ${JSON.stringify(buttonRect)}`);
    }
    markSmokeStage('read-picker:open-import-center');
    window.webContents.sendInputEvent({
      type: 'mouseMove',
      x: Math.round(buttonRect.x),
      y: Math.round(buttonRect.y)
    });
    window.webContents.sendInputEvent({
      type: 'mouseDown',
      x: Math.round(buttonRect.x),
      y: Math.round(buttonRect.y),
      button: 'left',
      clickCount: 1
    });
    window.webContents.sendInputEvent({
      type: 'mouseUp',
      x: Math.round(buttonRect.x),
      y: Math.round(buttonRect.y),
      button: 'left',
      clickCount: 1
    });
    const importCenter = await window.webContents.executeJavaScript(
      `new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const poll = () => {
        const layer = document.getElementById('projectImportModal');
        const button = document.getElementById('btnImportProjectDirectory');
        if (layer && button && !layer.classList.contains('hidden')) {
          const rect = button.getBoundingClientRect();
          const closeButton = document.getElementById('btnCloseProjectImportModal');
          const closeRect = closeButton?.getBoundingClientRect();
          const hit = closeRect
            ? document.elementFromPoint(closeRect.left + closeRect.width / 2, closeRect.top + closeRect.height / 2)
            : null;
          return resolve({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            disabled: button.disabled,
            layerZ: Number.parseInt(getComputedStyle(layer).zIndex, 10) || 0,
            topbarZ: Number.parseInt(getComputedStyle(document.querySelector('.app-topbar')).zIndex, 10) || 0,
            closeHitVisible: Boolean(closeButton && (hit === closeButton || closeButton.contains(hit))),
            layerManager: document.documentElement.dataset.layerManager || ''
          });
        }
        if (Date.now() - startedAt > 5000) return reject(new Error('Project import center timed out.'));
        setTimeout(poll, 40);
      };
      poll();
    })`,
      true
    );
    await captureSmokeScreenshot(window, 'workspace-project-import-center');
    await captureSmokeScreenshot(window, 'workspace-project-import-center-mobile', {
      width: 390,
      height: 844
    });
    if (process.env.CQNU_SMOKE_SCREENSHOT_DIR) {
      const bounds = window.getBounds();
      window.setBounds({ ...bounds, x: -32_000, y: -32_000 }, false);
      window.showInactive();
    }
    if (importCenter.disabled) throw new Error('recommended project directory option is disabled');
    markSmokeStage('read-picker:trusted-directory-click');
    window.webContents.sendInputEvent({
      type: 'mouseMove',
      x: Math.round(importCenter.x),
      y: Math.round(importCenter.y)
    });
    window.webContents.sendInputEvent({
      type: 'mouseDown',
      x: Math.round(importCenter.x),
      y: Math.round(importCenter.y),
      button: 'left',
      clickCount: 1
    });
    window.webContents.sendInputEvent({
      type: 'mouseUp',
      x: Math.round(importCenter.x),
      y: Math.round(importCenter.y),
      button: 'left',
      clickCount: 1
    });
    markSmokeStage('read-picker:await-project');
    const result = await window.webContents.executeJavaScript(
      `new Promise(resolve => {
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
              projectSourceKind: document.documentElement.dataset.projectSourceKind || '',
              sourceStatusVisible: Boolean(document.querySelector('.project-source-status')),
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
    })`,
      true
    );
    const failures = [];
    const workerRequestsAfterSelection = requestedPaths.filter(value =>
      /webDatabaseWorker|sqlite3-worker/i.test(value)
    );
    if (workerRequestsBeforeSelection.length) {
      failures.push(`SQLite workers loaded before project selection: ${workerRequestsBeforeSelection.join(',')}`);
    }
    if (!workerRequestsAfterSelection.length) failures.push('SQLite workers were not loaded after project selection');
    if (importCenter.layerManager !== 'layer-manager-v1')
      failures.push(`typed layer manager missing: ${importCenter.layerManager}`);
    if (importCenter.layerZ <= importCenter.topbarZ || !importCenter.closeHitVisible) {
      failures.push(`import center layer contract failed: ${JSON.stringify(importCenter)}`);
    }
    if (!result.called || !result.thisBound) failures.push('directory picker was not called with the Window receiver');
    if (!result.userActivation) failures.push('directory picker lost trusted user activation');
    if (result.mode !== 'read' || result.permissionModes.some(mode => mode !== 'read')) {
      failures.push(`read account requested invalid modes: ${result.mode} / ${result.permissionModes.join(',')}`);
    }
    if (!result.loaded || !result.projectLoaded || result.pointCount !== 1) {
      failures.push(
        `read account project load failed: ${result.loaded} / ${result.projectLoaded} / ${result.pointCount}`
      );
    }
    if (result.projectSourceKind !== 'directory' || !result.sourceStatusVisible) {
      failures.push(`project source status failed: ${result.projectSourceKind} / ${result.sourceStatusVisible}`);
    }
    if (!result.readOnly || result.writeProject) failures.push('read account received write capabilities');
    if (result.layerZ <= result.topbarZ || !result.closeHitVisible) {
      failures.push(
        `top-layer contract failed: ${JSON.stringify({
          layerZ: result.layerZ,
          topbarZ: result.topbarZ,
          closeHitVisible: result.closeHitVisible,
          layerHidden: result.layerHidden,
          layerAriaHidden: result.layerAriaHidden,
          closeRect: result.closeRect,
          hitTarget: result.hitTarget,
          openLayers: result.openLayers,
          openLayerDetails: result.openLayerDetails
        })}`
      );
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
  const isolatedSession = session.fromPartition(partition);
  const origin = new URL(baseUrl).origin;
  await isolatedSession.cookies.set({
    url: origin,
    name: 'smoke-login',
    value: 'logged-out',
    path: '/'
  });
  const errors = [];
  const requestedPaths = [];
  isolatedSession.webRequest.onCompleted(details => {
    try {
      requestedPaths.push(new URL(details.url).pathname);
    } catch {
      return;
    }
  });
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
    await window.webContents.executeJavaScript(
      `new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const poll = () => {
        const form = document.querySelector('[data-login-form]');
        if (form && !form.hidden) return resolve(true);
        if (Date.now() - startedAt > 8000) return reject(new Error('Login form timed out.'));
        setTimeout(poll, 40);
      };
      poll();
    })`,
      true
    );
    await captureSmokeScreenshot(window, 'management-login');
    await captureSmokeScreenshot(window, 'management-login-mobile', { width: 390, height: 844 });
    markSmokeStage('management:submit-login');
    const loginStartedAt = Date.now();
    const workspaceNavigation = waitForPathname(window, '/workspace');
    await window.webContents.executeJavaScript(
      `(() => {
      const form = document.querySelector('[data-login-form]');
      form.elements.username.value = 'web.smoke';
      form.elements.password.value = 'Smoke9!';
      form.requestSubmit();
      return true;
    })()`,
      true
    );
    await workspaceNavigation;
    await waitForRuntime(window);
    const loginReadyMs = Date.now() - loginStartedAt;
    const startupPaths = [...requestedPaths];
    const legacyBundlePaths = [...new Set(startupPaths.filter(value => value === '/assets/legacy-runtime.js'))];
    const unbundledLegacyPaths = startupPaths.filter(
      value => value.startsWith('/src/renderer/') && value.endsWith('.js')
    );
    const redirectedToWorkspace = new URL(window.webContents.getURL()).pathname === '/workspace';

    markSmokeStage('management:open-account');
    await window.loadURL(`${origin}/manage?next=/manage&view=account`);
    const accountReady = await window.webContents.executeJavaScript(
      `new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const poll = () => {
        const view = document.querySelector('[data-view="account"]');
        if (view && !view.hidden) return resolve(true);
        if (Date.now() - startedAt > 8000) return reject(new Error('Account view timed out.'));
        setTimeout(poll, 40);
      };
      poll();
    })`,
      true
    );
    markSmokeStage('management:upload-avatar');
    const avatarResult = await window.webContents.executeJavaScript(
      `(async () => {
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
    })()`,
      true
    );
    markSmokeStage('management:verify-security-dialogs');
    const securityDialogResult = await verifyManagementSecurityDialogs(window);
    await captureSmokeScreenshot(window, 'management-account');
    await captureSmokeScreenshot(window, 'management-account-mobile', { width: 390, height: 844 });
    markSmokeStage('management:verify-workspace-avatar');
    await window.loadURL(`${origin}/workspace`);
    await waitForRuntime(window);
    const workspaceAvatarVisible = await window.webContents.executeJavaScript(
      `Boolean(document.querySelector('.web-profile-avatar img')?.getAttribute('src')?.startsWith('data:image/'))`,
      true
    );
    const workspaceShellResult = await window.webContents.executeJavaScript(
      `(async () => {
      const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const layersButton = document.querySelector('[aria-controls="mapLayerPopover"]');
      const modulesButton = document.querySelector('[aria-controls="workspaceModuleLauncher"]');
      layersButton?.click();
      await nextFrame();
      const layerPopover = document.querySelector('#mapLayerPopover');
      const layerRect = layerPopover?.getBoundingClientRect();
      const layerHit = layerRect
        ? document.elementFromPoint(layerRect.left + Math.min(32, layerRect.width / 2), layerRect.top + Math.min(32, layerRect.height / 2))
        : null;
      const layerPopoverVisible = Boolean(layerPopover && !layerPopover.hidden && layerRect?.width && layerRect?.height);
      const zoneToggle = document.querySelector('#btnToggleZoneLayer');
      zoneToggle?.click();
      const zoneHidden = zoneToggle?.getAttribute('aria-checked') === 'false';
      zoneToggle?.click();
      const zoneRestored = zoneToggle?.getAttribute('aria-checked') === 'true';
      layersButton?.click();
      modulesButton?.click();
      await nextFrame();
      const modulePopover = document.querySelector('#workspaceModuleLauncher');
      const moduleRect = modulePopover?.getBoundingClientRect();
      const moduleHit = moduleRect
        ? document.elementFromPoint(moduleRect.left + Math.min(32, moduleRect.width / 2), moduleRect.top + Math.min(32, moduleRect.height / 2))
        : null;
      return {
        layerPopoverVisible,
        layerPopoverTopmost: Boolean(layerPopover && layerHit && layerPopover.contains(layerHit)),
        zoneHidden,
        zoneRestored,
        modulePopoverVisible: Boolean(modulePopover && !modulePopover.hidden && moduleRect?.width && moduleRect?.height),
        modulePopoverTopmost: Boolean(modulePopover && moduleHit && modulePopover.contains(moduleHit)),
        siteHomeLink: Boolean(modulePopover?.querySelector('.web-site-link[href="/"]')),
        docsLink: Boolean(modulePopover?.querySelector('.web-site-link[href="/docs"]')),
        capabilityDisclosure: Boolean(modulePopover?.querySelector('.web-capability-disclosure'))
      };
    })()`,
      true
    );
    await captureSmokeScreenshot(window, 'workspace');
    await captureSmokeScreenshot(window, 'workspace-mobile', { width: 390, height: 844 });
    const failures = [];
    if (!redirectedToWorkspace) failures.push('login did not route directly to workspace');
    if (loginReadyMs > 8_000) failures.push(`login-to-workspace startup is too slow: ${loginReadyMs}ms`);
    if (legacyBundlePaths.length !== 1 || unbundledLegacyPaths.length) {
      failures.push(
        `workspace runtime was not bundled: ${JSON.stringify({ legacyBundlePaths, unbundledLegacyPaths })}`
      );
    }
    if (!accountReady) failures.push('avatar link target did not open account view');
    if (!avatarResult.stored || !avatarResult.previewVisible || !workspaceAvatarVisible) {
      failures.push(`avatar workflow failed: ${JSON.stringify(avatarResult)} / ${workspaceAvatarVisible}`);
    }
    if (
      !securityDialogResult.bulkReset.open ||
      !securityDialogResult.bulkReset.visible ||
      !securityDialogResult.bulkReset.topmost ||
      !securityDialogResult.bulkReset.withinViewport ||
      !securityDialogResult.passwordChoice.open ||
      !securityDialogResult.passwordChoice.visible ||
      !securityDialogResult.passwordChoice.topmost ||
      !securityDialogResult.passwordChoice.withinViewport ||
      !securityDialogResult.noPageOverflow ||
      securityDialogResult.remainingOpenDialogs !== 0
    ) {
      failures.push(`management security dialog contract failed: ${JSON.stringify(securityDialogResult)}`);
    }
    if (
      !workspaceShellResult.layerPopoverVisible ||
      !workspaceShellResult.layerPopoverTopmost ||
      !workspaceShellResult.zoneHidden ||
      !workspaceShellResult.zoneRestored ||
      !workspaceShellResult.modulePopoverVisible ||
      !workspaceShellResult.modulePopoverTopmost ||
      !workspaceShellResult.siteHomeLink ||
      !workspaceShellResult.docsLink ||
      !workspaceShellResult.capabilityDisclosure
    ) {
      failures.push(`workspace shell contract failed: ${JSON.stringify(workspaceShellResult)}`);
    }
    failures.push(...errors);
    if (failures.length) throw new Error(failures.join('\n'));
    markSmokeStage('management:complete');
    return {
      redirectedToWorkspace,
      accountReady,
      loginReadyMs,
      legacyBundlePaths,
      unbundledLegacyPaths,
      ...avatarResult,
      securityDialogResult,
      workspaceAvatarVisible,
      workspaceShellResult
    };
  } finally {
    markSmokeStage('management:cleanup');
    window.destroy();
    await isolatedSession.clearStorageData();
  }
}

module.exports = {
  captureSmokeScreenshot,
  runManagementUiSmoke,
  runReadOnlyDirectoryPickerSmoke,
  setSmokeStageReporter,
  verifyManagementSecurityDialogs,
  waitForRuntime
};
