const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { writeVisualEvidence } = require('./visual-regression/evidence');

let stageReporter = () => {};

function markSmokeStage(stage) {
  stageReporter(stage);
}

function setSmokeStageReporter(reporter) {
  stageReporter = typeof reporter === 'function' ? reporter : () => {};
}

async function waitForRuntime(window) {
  await window.webContents.executeJavaScript(
    `new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      if (document.documentElement.dataset.runtimeStatus === 'ready') return resolve(true);
      if (document.documentElement.dataset.runtimeStatus === 'failed') return reject(new Error('Legacy runtime failed.'));
      if (Date.now() - startedAt > 15000) return reject(new Error('Web workspace runtime timed out.'));
      setTimeout(poll, 50);
    };
    poll();
  })`,
    true
  );
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

async function captureSmokeScreenshot(window, name, size = null) {
  const outputDirectory = process.env.CQNU_SMOKE_SCREENSHOT_DIR;
  if (!outputDirectory) return;
  const visualRegression = process.env.CQNU_VISUAL_REGRESSION === '1';
  const originalBounds = window.getBounds();
  window.setSkipTaskbar(true);
  window.setBounds(
    {
      ...originalBounds,
      width: size?.width || originalBounds.width,
      height: size?.height || originalBounds.height,
      x: -32_000,
      y: -32_000
    },
    false
  );
  if (!window.isVisible()) window.showInactive();
  const settleDelay = visualRegression ? 280 : 820;
  await new Promise(resolve => setTimeout(resolve, settleDelay));
  await window.webContents.executeJavaScript(
    `new Promise(resolve => {
    for (const animation of document.getAnimations()) {
      try { animation.finish(); } catch {}
    }
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`,
    true
  );
  window.webContents.invalidate();
  await new Promise(resolve => setTimeout(resolve, 120));
  await mkdir(outputDirectory, { recursive: true });
  const image = await window.webContents.capturePage();
  await writeFile(path.join(outputDirectory, `${name}.png`), image.toPNG());
  await writeVisualEvidence(window, outputDirectory, name, image);
  if (!visualRegression) {
    window.setBounds(originalBounds, false);
    window.hide();
  }
}

module.exports = {
  captureSmokeScreenshot,
  collectWindowErrors,
  markSmokeStage,
  setSmokeStageReporter,
  waitForPathname,
  waitForRuntime
};
