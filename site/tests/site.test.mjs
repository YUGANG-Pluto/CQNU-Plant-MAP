import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderPages } from '../src/render.mjs';

const workspaceHtml = '<!doctype html><html lang="zh-CN"><head><title>CQNU Plant MAP</title><link rel="stylesheet" href="./renderer-dist/modern-shell.css"></head><body data-site-workspace="true"><div id="modernUiRoot"></div><script src="./renderer-dist/modern-shell.js"></script></body></html>';

test('site routes render complete branded documents', () => {
  const pages = renderPages({ workspaceHtml });
  assert.deepEqual(Object.keys(pages), ['/', '/workspace', '/docs', '/web', '/release', '/privacy']);
  Object.values(pages).forEach(page => {
    assert.match(page, /^<!doctype html>/);
    assert.match(page, /CQNU Plant MAP/);
    assert.match(page, /(?:assets\/styles|renderer-dist\/modern-shell)\.css/);
    assert.doesNotMatch(page, /undefined|null|NaN/);
  });
});

test('workspace route receives the complete shared application document', () => {
  const workspace = renderPages({ workspaceHtml })['/workspace'];
  assert.match(workspace, /data-site-workspace="true"/);
  assert.match(workspace, /modernUiRoot/);
  assert.match(workspace, /renderer-dist\/modern-shell\.js/);
});

test('published pages never embed local paths or desktop bridge names', () => {
  const serialized = JSON.stringify(renderPages({ workspaceHtml }));
  assert.doesNotMatch(serialized, /[A-Za-z]:\\\\/);
  assert.doesNotMatch(serialized, /window\.plantApp/);
  assert.doesNotMatch(serialized, /better-sqlite3/);
});

test('workspace service worker caches only same-origin application resources', async () => {
  const source = await readFile(new URL('../public/workspace-service-worker.js', import.meta.url), 'utf8');
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /_cqnu-local-image/);
  assert.doesNotMatch(source, /api\.gbif|api\.inaturalist|fetch\(['"]https:/);
});
