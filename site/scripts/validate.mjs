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

const health = await worker.fetch(new Request('https://example.test/health'));
assert.deepEqual(await health.json(), { ok: true, version: siteMeta.version });
const preview = await worker.fetch(new Request('https://example.test/assets/app-preview.png'));
assert.equal(preview.status, 200);
assert.match(preview.headers.get('content-type') || '', /image\/png/);
assert.ok((await preview.arrayBuffer()).byteLength > 1000);
for (const asset of ['/assets/workspace.js', '/assets/web-project.js']) {
  const response = await worker.fetch(new Request(`https://example.test${asset}`));
  const source = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/javascript/);
  assert.match(source, /createWebProjectSession/);
  assert.doesNotMatch(source, /[A-Za-z]:\\/);
}
const missing = await worker.fetch(new Request('https://example.test/missing'));
assert.equal(missing.status, 404);
console.log('Site Worker validation passed');
