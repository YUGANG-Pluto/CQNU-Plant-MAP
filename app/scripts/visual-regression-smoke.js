const { access } = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
const { createSiteServer } = require('./web-workspace-smoke');
const { captureSmokeScreenshot, waitForRuntime } = require('./web-workspace-ui-smoke');

app.on('window-all-closed', () => {
  // Scene windows are short-lived; the runner owns the final application exit.
});

async function waitForSelector(window, selector, timeoutMs = 10_000, requireEnabled = false) {
  await window.webContents.executeJavaScript(
    `new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (
        node &&
        !node.hidden &&
        node.getClientRects().length > 0 &&
        (!${requireEnabled} || !node.disabled)
      ) return resolve(true);
      if (Date.now() - startedAt > ${timeoutMs}) return reject(new Error('Visual selector timed out: ${selector}'));
      setTimeout(poll, 40);
    };
    poll();
  })`,
    true
  );
}

async function clickSelector(window, selector, timeoutMs = 15_000) {
  await waitForSelector(window, selector, timeoutMs, true);
  const point = await window.webContents.executeJavaScript(
    `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    const rect = node?.getBoundingClientRect();
    if (!node || !rect || node.disabled) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`,
    true
  );
  if (!point) throw new Error(`Visual control is not clickable: ${selector}`);
  window.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(point.x), y: Math.round(point.y) });
  window.webContents.sendInputEvent({
    type: 'mouseDown',
    x: Math.round(point.x),
    y: Math.round(point.y),
    button: 'left',
    clickCount: 1
  });
  window.webContents.sendInputEvent({
    type: 'mouseUp',
    x: Math.round(point.x),
    y: Math.round(point.y),
    button: 'left',
    clickCount: 1
  });
  await window.webContents.executeJavaScript(
    `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
    true
  );
}

async function prepareCloudProjectLibrary(window) {
  await window.webContents.executeJavaScript(
    `new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      const modal = document.getElementById('projectImportModal');
      const button = document.getElementById('btnOpenCloudProjectLibrary');
      const layerManager = window.cqnuLayerManager;
      if (modal && button && window.siteCloudProjects && typeof layerManager?.open === 'function') {
        layerManager.open(modal, { focusTarget: button });
        return resolve(true);
      }
      if (Date.now() - startedAt > 15_000) {
        const state = {
          modal: Boolean(modal),
          button: Boolean(button),
          cloudClient: window.siteCloudProjects?.version || '',
          layerManager: layerManager?.version || '',
          platformRuntime: window.platformAdapter?.runtime || '',
          runtimeStatus: document.documentElement.dataset.runtimeStatus || '',
          workspaceSession: document.documentElement.dataset.workspaceSession || ''
        };
        return reject(new Error('Cloud project visual state timed out: ' + JSON.stringify(state)));
      }
      setTimeout(poll, 40);
    };
    poll();
  })`,
    true
  );
  await waitForSelector(window, '#btnOpenCloudProjectLibrary', 15_000);
  await new Promise(resolve => setTimeout(resolve, 320));
  await clickSelector(window, '#btnOpenCloudProjectLibrary');
  await waitForSelector(window, '.cloud-project-card', 15_000);
  await clickSelector(window, '[data-cloud-project-history]');
  await waitForSelector(window, '.cloud-project-history li', 15_000);
}

async function setLoginCookie(isLoggedOut, isolatedSession, origin) {
  await isolatedSession.cookies.remove(origin, 'smoke-login');
  await isolatedSession.cookies.set({
    url: origin,
    name: 'smoke-login',
    value: isLoggedOut ? 'logged-out' : 'active',
    path: '/'
  });
}

function createVisualWindow(isolatedSession, name) {
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
  let rendererFailure = null;
  window.webContents.on('render-process-gone', (_event, details) => {
    rendererFailure = new Error(
      `Visual renderer stopped during ${name}: ${details.reason || 'unknown'} (${details.exitCode ?? 'no exit code'}).`
    );
  });
  window.on('unresponsive', () => {
    rendererFailure = new Error(`Visual renderer became unresponsive during ${name}.`);
  });
  return {
    window,
    assertHealthy(stage) {
      if (rendererFailure) throw rendererFailure;
      if (window.isDestroyed() || window.webContents.isDestroyed()) {
        throw new Error(`Visual window closed during ${name} (${stage}).`);
      }
    }
  };
}

async function assertEvidence(name) {
  const outputDirectory = process.env.CQNU_SMOKE_SCREENSHOT_DIR;
  if (!outputDirectory) return;
  await access(path.join(outputDirectory, `${name}.visual.json`));
}

async function captureScene(isolatedSession, origin, name, pathname, options = {}) {
  process.stdout.write(`[visual] ${name}\n`);
  const { window, assertHealthy } = createVisualWindow(isolatedSession, name);
  try {
    await window.loadURL(`${origin}${pathname}`);
    assertHealthy('navigation');
    if (options.runtime) await waitForRuntime(window);
    if (options.selector) await waitForSelector(window, options.selector);
    if (options.prepareWindow) await options.prepareWindow(window);
    if (options.prepare) await window.webContents.executeJavaScript(options.prepare, true);
    assertHealthy('preparation');
    await captureSmokeScreenshot(window, name, { width: 1440, height: 960 });
    await assertEvidence(name);
    assertHealthy('desktop capture');
    if (options.mobile) {
      const mobileName = `${name}-mobile`;
      await captureSmokeScreenshot(window, mobileName, { width: 390, height: 844 });
      await assertEvidence(mobileName);
      assertHealthy('mobile capture');
    }
    if (options.inspect) return await window.webContents.executeJavaScript(options.inspect, true);
    return null;
  } finally {
    if (!window.isDestroyed()) window.destroy();
  }
}

async function run() {
  app.disableHardwareAcceleration();
  await app.whenReady();
  const { server, url } = await createSiteServer();
  const origin = new URL(url).origin;
  const isolatedSession = session.fromPartition(`visual-regression-${Date.now()}`);

  try {
    await setLoginCookie(true, isolatedSession, origin);
    await captureScene(isolatedSession, origin, 'management-login', '/manage', {
      selector: '[data-login-form]',
      mobile: true
    });

    await setLoginCookie(false, isolatedSession, origin);
    await captureScene(isolatedSession, origin, 'management-account', '/manage?next=/manage&view=account', {
      selector: '[data-view="account"]',
      mobile: true
    });

    await captureScene(isolatedSession, origin, 'management-storage', '/manage?next=/manage&view=storage', {
      selector: '[data-view="storage"]',
      mobile: true
    });

    await captureScene(isolatedSession, origin, 'workspace', '/workspace', {
      runtime: true,
      mobile: true,
      prepare: `(async () => {
        const button = document.querySelector('[aria-controls="workspaceModuleLauncher"]');
        button?.click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return true;
      })()`
    });

    await captureScene(isolatedSession, origin, 'cloud-project-library', '/workspace', {
      runtime: true,
      mobile: true,
      prepareWindow: prepareCloudProjectLibrary
    });

    await captureScene(isolatedSession, origin, 'site-home', '/', { mobile: true });
    await captureScene(isolatedSession, origin, 'site-docs', '/docs', { mobile: true });
    await captureScene(isolatedSession, origin, 'site-architecture', '/web');
    await captureScene(isolatedSession, origin, 'site-release', '/release');
    await captureScene(isolatedSession, origin, 'site-privacy', '/privacy');
    const inspectorResult = await captureScene(
      isolatedSession,
      origin,
      'site-project-inspector',
      '/apps/project-inspector',
      {
        selector: '[data-project-directory-input]',
        mobile: true,
        prepare: `(async () => {
        const fixtures = [
          ['Project/settings.json', JSON.stringify({ projectName: 'Visual smoke' }), 'application/json'],
          ['Project/zones.json', JSON.stringify([{ id: 'zone-a' }]), 'application/json'],
          ['Project/points.json', JSON.stringify([{ id: 'point-a', zoneRef: 'zone-a' }]), 'application/json'],
          ['Project/information/data.db', 'SQLite format 3\\0' + '0'.repeat(32), 'application/octet-stream'],
          ['Project/images/point-a.jpg', 'image-bytes', 'image/jpeg']
        ];
        const transfer = new DataTransfer();
        fixtures.forEach(([relativePath, content, type]) => {
          const file = new File([content], relativePath.split('/').at(-1), { type });
          Object.defineProperty(file, 'webkitRelativePath', { configurable: true, value: relativePath });
          transfer.items.add(file);
        });
        const input = document.querySelector('[data-project-directory-input]');
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve, reject) => {
          const startedAt = Date.now();
          const poll = () => {
            if (!document.querySelector('[data-project-results]')?.hidden) return resolve();
            if (Date.now() - startedAt > 8000) return reject(new Error('Project inspector result timed out.'));
            setTimeout(poll, 40);
          };
          poll();
        });
        return true;
      })()`,
        inspect: `({
      fileCount: document.querySelector('[data-project-metric="files"]')?.textContent,
      recordCount: document.querySelector('[data-project-metric="records"]')?.textContent,
      rows: document.querySelectorAll('[data-project-files] tr').length,
      exportEnabled: !document.querySelector('[data-project-export]')?.disabled,
      status: document.querySelector('[data-project-status]')?.textContent || ''
    })`
      }
    );
    if (
      inspectorResult.fileCount !== '5' ||
      inspectorResult.recordCount !== '2' ||
      inspectorResult.rows !== 5 ||
      !inspectorResult.exportEnabled ||
      !inspectorResult.status.includes('预检完成')
    ) {
      throw new Error(`Project inspector contract failed: ${JSON.stringify(inspectorResult)}`);
    }
    process.stdout.write('visual scene capture passed\n');
  } finally {
    await isolatedSession.clearStorageData();
    await new Promise(resolve => server.close(resolve));
  }
}

const timeout = setTimeout(() => {
  process.stderr.write('Visual scene capture exceeded the 75 second limit.\n');
  process.exitCode = 1;
  app.exit(1);
}, 75_000);

run()
  .then(() => {
    clearTimeout(timeout);
    process.exitCode = 0;
    app.quit();
  })
  .catch(error => {
    clearTimeout(timeout);
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
    app.exit(1);
  });
