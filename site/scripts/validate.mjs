import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteMeta } from '../src/content.mjs';
import { createLocalSiteRuntime } from './local-runtime.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = resolve(projectRoot, 'dist/server/index.js');
const source = await readFile(workerPath, 'utf8');
const { worker, env } = await createLocalSiteRuntime();

async function fetchSite(path, init) {
  return worker.fetch(new Request(`https://example.test${path}`, init), env);
}

assert.equal(typeof worker?.fetch, 'function');
assert.ok((await stat(workerPath)).size < 512_000, 'Site Worker should remain below 500 KiB');
assert.doesNotMatch(source, /APP_ASSETS|sqlite3-worker1-[A-Za-z0-9_-]+.*base64/);
for (const route of [
  '/',
  '/workspace',
  '/manage',
  '/docs',
  '/web',
  '/release',
  '/privacy',
  '/apps/project-inspector'
]) {
  const response = await fetchSite(route);
  const html = await response.text();
  assert.equal(response.status, 200, `${route} should return 200`);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  assert.match(html, /CQNU Plant MAP/);
  assert.doesNotMatch(html, /undefined|null|NaN/);
}

const pagePresentationContracts = new Map([
  ['/', ['site-page--home', '#f7fbf8']],
  ['/docs', ['site-page--docs', '#f7f9fc']],
  ['/web', ['site-page--architecture', '#f6fafb']],
  ['/release', ['site-page--release', '#fbf8f9']],
  ['/privacy', ['site-page--privacy', '#f7faf8']],
  ['/apps/project-inspector', ['site-page--app-inspector', '#f4faf9']]
]);
for (const [route, [pageClass, themeColor]] of pagePresentationContracts) {
  const response = await fetchSite(route);
  const html = await response.text();
  assert.match(html, new RegExp(`class="site-page ${pageClass}"`));
  assert.match(html, new RegExp(`name="theme-color" content="${themeColor}"`));
}

const workspace = await fetchSite('/workspace');
const workspaceHtml = await workspace.text();
assert.match(workspaceHtml, /modernUiRoot/);
assert.match(workspaceHtml, /workspace-access-gate/);
assert.match(workspaceHtml, /assets\/workspace-gate\.js/);
assert.match(workspaceHtml, /assets\/legacy-runtime\.js/);
assert.match(workspaceHtml, /data-gate-progress/);
assert.doesNotMatch(workspaceHtml, /<script src="\.\/renderer-dist\/modern-shell\.js"><\/script>/);
assert.match(workspace.headers.get('content-security-policy') || '', /wasm-unsafe-eval/);
assert.match(workspace.headers.get('content-security-policy') || '', /worker-src 'self' blob:/);
assert.match(workspace.headers.get('content-security-policy') || '', /connect-src 'self' https: data:/);

const health = await fetchSite('/health');
const healthData = await health.json();
assert.equal(healthData.ok, true);
assert.equal(healthData.version, siteMeta.version);
assert.equal(healthData.artifactVersion, 4);
assert.equal(healthData.channel, 'site/main');
assert.ok(healthData.clientAssetCount > 20);
assert.ok(healthData.clientAssetCount < 80, 'Published assets should not contain the unbundled renderer source tree');
const preview = await fetchSite('/assets/app-preview.png');
assert.equal(preview.status, 200);
assert.match(preview.headers.get('content-type') || '', /image\/png/);
assert.ok((await preview.arrayBuffer()).byteLength > 1000);
const projectInspectorPage = await fetchSite('/apps/project-inspector');
const projectInspectorHtml = await projectInspectorPage.text();
assert.match(projectInspectorHtml, /data-project-inspector/);
assert.match(projectInspectorHtml, /assets\/project-inspector\.js/);
assert.match(projectInspectorHtml, /不上传/);
for (const asset of ['/assets/apps.css', '/assets/project-inspector.js']) {
  const response = await fetchSite(asset);
  assert.equal(response.status, 200, `${asset} should return 200`);
}
for (const asset of ['/renderer-dist/modern-shell.js', '/assets/legacy-runtime.js', '/assets/workspace-gate.js']) {
  const response = await fetchSite(asset);
  const source = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/javascript/);
  assert.ok(source.length > 1000);
  assert.doesNotMatch(source, /[A-Za-z]:\\/);
}
for (const asset of [
  '/assets/manage.js',
  '/assets/manage-context.js',
  '/assets/manage-session.js',
  '/assets/manage-profile.js',
  '/assets/manage-members.js',
  '/assets/manage-cloud.js',
  '/assets/manage-api.js',
  '/assets/manage-i18n.js',
  '/assets/manage-dom.js'
]) {
  const response = await fetchSite(asset);
  const moduleSource = await response.text();
  assert.equal(response.status, 200, `${asset} should return 200`);
  assert.match(response.headers.get('content-type') || '', /text\/javascript/);
  assert.ok(moduleSource.length > 40, `${asset} should not be empty`);
  assert.doesNotMatch(moduleSource, /[A-Za-z]:\\/);
}
const unbundledLegacyLoader = await fetchSite('/src/renderer/legacy-loader.js');
assert.equal(unbundledLegacyLoader.status, 404);
const managementPage = await fetchSite('/manage');
const managementHtml = await managementPage.text();
assert.match(managementHtml, /data-manage-shell/);
assert.match(managementHtml, /assets\/manage\.js/);
assert.match(managementPage.headers.get('content-security-policy') || '', /connect-src 'self'/);
const unavailableSession = await fetchSite('/api/manage/session');
const unavailableSessionData = await unavailableSession.json();
assert.equal(unavailableSession.status, 503);
assert.equal(unavailableSessionData.ok, false);
assert.equal(unavailableSessionData.error.code, 'MANAGEMENT_SERVICE_UNAVAILABLE');
const modernShellResponse = await fetchSite('/renderer-dist/modern-shell.js');
const modernShellSource = await modernShellResponse.text();
assert.match(
  modernShellSource,
  /project-workflow-v1/,
  'Modern shell should include the shared project workflow bridge'
);
const databaseWorkerMatch = modernShellSource.match(/assets\/webDatabaseWorker-[A-Za-z0-9_-]+\.js/);
assert.ok(databaseWorkerMatch, 'Modern shell should reference the browser database Worker');
const databaseWorkerResponse = await fetchSite(`/${databaseWorkerMatch[0]}`);
const databaseWorkerSource = await databaseWorkerResponse.text();
assert.equal(databaseWorkerResponse.status, 200);
assert.match(databaseWorkerResponse.headers.get('content-type') || '', /text\/javascript/);
const sqliteWorkerMatch = databaseWorkerSource.match(/assets\/sqlite3-worker1-[A-Za-z0-9_-]+\.js/);
assert.ok(sqliteWorkerMatch, 'Database Worker should reference its SQLite Worker asset');
const sqliteWorkerResponse = await fetchSite(`/${sqliteWorkerMatch[0]}`);
assert.equal(sqliteWorkerResponse.status, 200);
assert.match(sqliteWorkerResponse.headers.get('content-type') || '', /text\/javascript/);
const manifest = await fetchSite('/workspace.webmanifest');
assert.equal(manifest.status, 200);
assert.match(manifest.headers.get('content-type') || '', /application\/manifest\+json/);
assert.equal((await manifest.json()).start_url, '/workspace');
const serviceWorker = await fetchSite('/workspace-service-worker.js');
const serviceWorkerSource = await serviceWorker.text();
assert.equal(serviceWorker.status, 200);
assert.equal(serviceWorker.headers.get('service-worker-allowed'), '/');
assert.match(serviceWorkerSource, /url\.origin !== self\.location\.origin/);
assert.doesNotMatch(serviceWorkerSource, /api\.gbif|api\.inaturalist/);
assert.equal(serviceWorker.headers.get('cache-control'), 'no-cache');
const immutableAsset = await fetchSite(`/${databaseWorkerMatch[0]}`);
assert.match(immutableAsset.headers.get('cache-control') || '', /immutable/);
const methodNotAllowed = await fetchSite('/workspace', { method: 'POST' });
assert.equal(methodNotAllowed.status, 405);
const missing = await fetchSite('/missing');
assert.equal(missing.status, 404);
console.log('Site Worker validation passed');
