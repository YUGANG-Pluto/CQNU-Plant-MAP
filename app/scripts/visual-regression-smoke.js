const { app, BrowserWindow, session } = require('electron');
const { createSiteServer } = require('./web-workspace-smoke');
const { captureSmokeScreenshot, waitForRuntime } = require('./web-workspace-ui-smoke');

async function waitForSelector(window, selector, timeoutMs = 10_000) {
  await window.webContents.executeJavaScript(
    `new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (node && !node.hidden && node.getClientRects().length > 0) return resolve(true);
      if (Date.now() - startedAt > ${timeoutMs}) return reject(new Error('Visual selector timed out: ${selector}'));
      setTimeout(poll, 40);
    };
    poll();
  })`,
    true
  );
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

async function captureScene(window, origin, name, pathname, options = {}) {
  process.stdout.write(`[visual] ${name}\n`);
  await window.loadURL(`${origin}${pathname}`);
  if (options.runtime) await waitForRuntime(window);
  if (options.selector) await waitForSelector(window, options.selector);
  if (options.prepare) await window.webContents.executeJavaScript(options.prepare, true);
  await captureSmokeScreenshot(window, name, { width: 1440, height: 960 });
  if (options.mobile) {
    await captureSmokeScreenshot(window, `${name}-mobile`, { width: 390, height: 844 });
  }
}

async function run() {
  app.disableHardwareAcceleration();
  await app.whenReady();
  const { server, url } = await createSiteServer();
  const origin = new URL(url).origin;
  const isolatedSession = session.fromPartition(`visual-regression-${Date.now()}`);
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

  try {
    await setLoginCookie(true, isolatedSession, origin);
    await captureScene(window, origin, 'management-login', '/manage', {
      selector: '[data-login-form]',
      mobile: true
    });

    await setLoginCookie(false, isolatedSession, origin);
    await captureScene(window, origin, 'management-account', '/manage?next=/manage&view=account', {
      selector: '[data-view="account"]',
      mobile: true
    });

    await captureScene(window, origin, 'workspace', '/workspace', {
      runtime: true,
      mobile: true,
      prepare: `(async () => {
        const button = document.querySelector('[aria-controls="workspaceModuleLauncher"]');
        button?.click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return true;
      })()`
    });

    await captureScene(window, origin, 'site-home', '/', { mobile: true });
    await captureScene(window, origin, 'site-docs', '/docs', { mobile: true });
    await captureScene(window, origin, 'site-architecture', '/web');
    await captureScene(window, origin, 'site-release', '/release');
    await captureScene(window, origin, 'site-privacy', '/privacy');
    await captureScene(window, origin, 'site-project-inspector', '/apps/project-inspector', {
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
      })()`
    });
    const inspectorResult = await window.webContents.executeJavaScript(
      `({
      fileCount: document.querySelector('[data-project-metric="files"]')?.textContent,
      recordCount: document.querySelector('[data-project-metric="records"]')?.textContent,
      rows: document.querySelectorAll('[data-project-files] tr').length,
      exportEnabled: !document.querySelector('[data-project-export]')?.disabled,
      status: document.querySelector('[data-project-status]')?.textContent || ''
    })`,
      true
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
    window.destroy();
    await isolatedSession.clearStorageData();
    await new Promise(resolve => server.close(resolve));
  }
}

const timeout = setTimeout(() => {
  process.stderr.write('Visual scene capture exceeded the 75 second limit.\n');
  app.exit(1);
}, 75_000);

run()
  .then(() => {
    clearTimeout(timeout);
    app.quit();
  })
  .catch(error => {
    clearTimeout(timeout);
    process.stderr.write(`${error?.stack || error}\n`);
    app.exit(1);
  });
