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
for (const route of ['/', '/workspace', '/manage', '/docs', '/web', '/release', '/privacy']) {
  const response = await fetchSite(route);
  const html = await response.text();
  assert.equal(response.status, 200, `${route} should return 200`);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  assert.match(html, /CQNU Plant MAP/);
  assert.doesNotMatch(html, /undefined|null|NaN/);
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
assert.equal(healthData.channel, 'web/main');
assert.equal(healthData.artifactVersion, 3);
assert.ok(healthData.clientAssetCount > 100);
const preview = await fetchSite('/assets/app-preview.png');
assert.equal(preview.status, 200);
assert.match(preview.headers.get('content-type') || '', /image\/png/);
assert.ok((await preview.arrayBuffer()).byteLength > 1000);
for (const asset of [
  '/renderer-dist/modern-shell.js',
  '/src/renderer/legacy-loader.js',
  '/assets/legacy-runtime.js',
  '/assets/workspace-gate.js',
  '/assets/manage.js',
  '/assets/manage-api.js'
]) {
  const response = await fetchSite(asset);
  const source = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/javascript/);
  assert.ok(source.length > 1000);
  assert.doesNotMatch(source, /[A-Za-z]:\\/);
}
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
