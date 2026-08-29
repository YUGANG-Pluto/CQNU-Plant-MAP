const { spawnSync } = require('node:child_process');
const { mkdir, readFile, readdir, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');

const electronPath = require('electron');
const root = path.resolve(__dirname, '..');
const evidenceDirectory = path.join(root, '.artifacts', 'visual-current');
const baselinePath = path.join(root, 'tests', 'visual', 'baseline.json');
const mode = process.argv[2] === 'update' ? 'update' : 'check';

function escapeWorkflowData(value) {
  return String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function summarizeSmokeOutput(result) {
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  return output ? `\n${output.slice(-8_000)}` : '';
}

const REQUIRED_SCENES = Object.freeze([
  'workspace',
  'workspace-mobile',
  'cloud-project-library',
  'cloud-project-library-mobile',
  'management-login',
  'management-login-mobile',
  'management-account',
  'management-account-mobile',
  'management-storage',
  'management-storage-mobile',
  'site-home',
  'site-home-mobile',
  'site-docs',
  'site-docs-mobile',
  'site-architecture',
  'site-release',
  'site-privacy',
  'site-project-inspector',
  'site-project-inspector-mobile'
]);

function runSmoke() {
  const result = spawnSync(electronPath, [path.join(root, 'scripts', 'visual-regression-smoke.js')], {
    cwd: root,
    env: {
      ...process.env,
      CQNU_SMOKE_SCREENSHOT_DIR: evidenceDirectory,
      CQNU_VISUAL_REGRESSION: '1'
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90_000
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Visual smoke exited with status ${result.status}.${summarizeSmokeOutput(result)}`);
  }
  if (!result.stdout?.includes('visual scene capture passed')) {
    throw new Error('Visual smoke exited before all scenes completed.');
  }
}

async function readEvidence() {
  const files = await readdir(evidenceDirectory);
  const scenes = {};
  for (const name of REQUIRED_SCENES) {
    const fileName = `${name}.visual.json`;
    if (!files.includes(fileName)) throw new Error(`Visual scene is missing: ${name}`);
    scenes[name] = JSON.parse(await readFile(path.join(evidenceDirectory, fileName), 'utf8'));
  }
  return scenes;
}

function compareNumber(label, actual, expected, tolerance, failures) {
  if (Math.abs(Number(actual) - Number(expected)) > tolerance) {
    failures.push(`${label}: expected ${expected} +/- ${tolerance}, received ${actual}`);
  }
}

function compareIdentity(name, actual, expected, failures) {
  if (actual.pathname !== expected.pathname) {
    failures.push(`${name} pathname changed: ${expected.pathname} -> ${actual.pathname}`);
  }
  if (JSON.stringify(actual.bodyClasses) !== JSON.stringify(expected.bodyClasses)) {
    failures.push(
      `${name} theme classes changed: ${JSON.stringify(expected.bodyClasses)} -> ${JSON.stringify(actual.bodyClasses)}`
    );
  }
  for (const [key, value] of Object.entries(expected.themeVariables || {})) {
    if (actual.themeVariables?.[key] !== value) {
      failures.push(
        `${name} theme variable ${key} changed: ${value} -> ${actual.themeVariables?.[key] || '<missing>'}`
      );
    }
  }
  if (actual.themeColor !== expected.themeColor) {
    failures.push(`${name} theme-color changed: ${expected.themeColor} -> ${actual.themeColor}`);
  }
}

function compareBitmap(name, actual, expected, failures) {
  const actualAspectRatio = Number(actual.width) / Math.max(1, Number(actual.height));
  const expectedAspectRatio = Number(expected.width) / Math.max(1, Number(expected.height));
  compareNumber(`${name} bitmap aspect ratio`, actualAspectRatio, expectedAspectRatio, 0.01, failures);
  compareNumber(`${name} average luminance`, actual.luma, expected.luma, 16, failures);
  const actualChannels = actual.cells.flat();
  const expectedChannels = expected.cells.flat();
  if (actualChannels.length !== expectedChannels.length) {
    failures.push(`${name} visual grid size changed.`);
    return;
  }
  const totalDelta = actualChannels.reduce((sum, value, index) => sum + Math.abs(value - expectedChannels[index]), 0);
  const meanDelta = totalDelta / Math.max(1, actualChannels.length);
  if (meanDelta > 18) {
    failures.push(`${name} visual color grid changed beyond tolerance: ${meanDelta.toFixed(2)} > 18`);
  }
}

function compareLayout(name, actual, expected, failures) {
  compareNumber(`${name} viewport width`, actual.viewport.width, expected.viewport.width, 4, failures);
  compareNumber(`${name} viewport height`, actual.viewport.height, expected.viewport.height, 4, failures);
  if (actual.document.horizontalOverflow > 2) {
    failures.push(`${name} creates ${actual.document.horizontalOverflow}px document-level horizontal overflow.`);
  }
  compareIdentity(name, actual.identity, expected.identity, failures);
  for (const [selector, expectedRect] of Object.entries(expected.anchors || {})) {
    const actualRect = actual.anchors?.[selector];
    if (!actualRect) {
      failures.push(`${name} visual anchor disappeared: ${selector}`);
      continue;
    }
    const tolerance = actual.viewport.width <= 420 ? 28 : 20;
    for (const property of ['x', 'y', 'width', 'height']) {
      compareNumber(
        `${name} ${selector} ${property}`,
        actualRect[property],
        expectedRect[property],
        tolerance,
        failures
      );
    }
  }
}

function serializeBaseline(value) {
  return JSON.stringify(value, null, 2).replace(
    /\[\n((?:\s+-?\d+(?:\.\d+)?(?:,)?\n)+)\s*\]/gu,
    (_, body) => `[${body.match(/-?\d+(?:\.\d+)?/gu).join(', ')}]`
  );
}

async function main() {
  await rm(evidenceDirectory, { recursive: true, force: true });
  await mkdir(evidenceDirectory, { recursive: true });
  runSmoke();
  const scenes = await readEvidence();

  if (mode === 'update') {
    await mkdir(path.dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, `${serializeBaseline({ version: 1, scenes })}\n`, 'utf8');
    process.stdout.write(`visual baseline updated (${REQUIRED_SCENES.length} scenes)\n`);
    return;
  }

  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const failures = [];
  for (const name of REQUIRED_SCENES) {
    const expected = baseline.scenes?.[name];
    const actual = scenes[name];
    if (!expected) {
      failures.push(`Baseline scene is missing: ${name}`);
      continue;
    }
    compareBitmap(name, actual.bitmap, expected.bitmap, failures);
    compareLayout(name, actual.layout, expected.layout, failures);
  }
  if (failures.length) throw new Error(failures.join('\n'));
  process.stdout.write(`visual regression passed (${REQUIRED_SCENES.length} scenes)\n`);
}

main().catch(error => {
  const detail = error?.stack || String(error);
  console.error(detail);
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.error(`::error title=Visual regression failed::${escapeWorkflowData(detail)}`);
  }
  process.exitCode = 1;
});
