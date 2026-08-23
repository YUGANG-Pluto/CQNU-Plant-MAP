import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteMeta } from '../src/content.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = resolve(projectRoot, 'dist/server/index.js');
const source = await readFile(workerPath, 'utf8');
const workerUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const worker = (await import(workerUrl)).default;

assert.equal(typeof worker?.fetch, 'function');
for (const route of ['/', '/workspace', '/docs', '/web', '/release', '/privacy']) {
  const response = await worker.fetch(new Request(`https://example.test${route}`));
  const html = await response.text();
  assert.equal(response.status, 200, `${route} should return 200`);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  assert.match(html, /CQNU Plant MAP/);
  assert.doesNotMatch(html, /undefined|null|NaN/);
}

const workspace = await worker.fetch(new Request('https://example.test/workspace'));
const workspaceHtml = await workspace.text();
assert.match(workspaceHtml, /modernUiRoot/);
assert.match(workspaceHtml, /renderer-dist\/modern-shell\.js/);
assert.match(workspace.headers.get('content-security-policy') || '', /wasm-unsafe-eval/);
assert.match(workspace.headers.get('content-security-policy') || '', /worker-src 'self' blob:/);
assert.match(workspace.headers.get('content-security-policy') || '', /connect-src 'self' https: data:/);

const health = await worker.fetch(new Request('https://example.test/health'));
assert.deepEqual(await health.json(), { ok: true, version: siteMeta.version });
const preview = await worker.fetch(new Request('https://example.test/assets/app-preview.png'));
assert.equal(preview.status, 200);
assert.match(preview.headers.get('content-type') || '', /image\/png/);
assert.ok((await preview.arrayBuffer()).byteLength > 1000);
for (const asset of ['/renderer-dist/modern-shell.js', '/src/renderer/legacy-loader.js']) {
  const response = await worker.fetch(new Request(`https://example.test${asset}`));
  const source = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/javascript/);
  assert.ok(source.length > 1000);
  assert.doesNotMatch(source, /[A-Za-z]:\\/);
}
const modernShellResponse = await worker.fetch(new Request('https://example.test/renderer-dist/modern-shell.js'));
const modernShellSource = await modernShellResponse.text();
const databaseWorkerMatch = modernShellSource.match(/assets\/webDatabaseWorker-[A-Za-z0-9_-]+\.js/);
assert.ok(databaseWorkerMatch, 'Modern shell should reference the browser database Worker');
const databaseWorkerResponse = await worker.fetch(new Request(`https://example.test/${databaseWorkerMatch[0]}`));
const databaseWorkerSource = await databaseWorkerResponse.text();
assert.equal(databaseWorkerResponse.status, 200);
assert.match(databaseWorkerResponse.headers.get('content-type') || '', /text\/javascript/);
const sqliteWorkerMatch = databaseWorkerSource.match(/assets\/sqlite3-worker1-[A-Za-z0-9_-]+\.js/);
assert.ok(sqliteWorkerMatch, 'Database Worker should reference its SQLite Worker asset');
const sqliteWorkerResponse = await worker.fetch(new Request(`https://example.test/${sqliteWorkerMatch[0]}`));
assert.equal(sqliteWorkerResponse.status, 200);
assert.match(sqliteWorkerResponse.headers.get('content-type') || '', /text\/javascript/);
const manifest = await worker.fetch(new Request('https://example.test/workspace.webmanifest'));
assert.equal(manifest.status, 200);
assert.match(manifest.headers.get('content-type') || '', /application\/manifest\+json/);
assert.equal((await manifest.json()).start_url, '/workspace');
const serviceWorker = await worker.fetch(new Request('https://example.test/workspace-service-worker.js'));
const serviceWorkerSource = await serviceWorker.text();
assert.equal(serviceWorker.status, 200);
assert.equal(serviceWorker.headers.get('service-worker-allowed'), '/');
assert.match(serviceWorkerSource, /url\.origin !== self\.location\.origin/);
assert.doesNotMatch(serviceWorkerSource, /api\.gbif|api\.inaturalist/);
const missing = await worker.fetch(new Request('https://example.test/missing'));
assert.equal(missing.status, 404);
console.log('Site Worker validation passed');
