import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderPages } from '../src/render.mjs';

const workspaceHtml = '<!doctype html><html lang="zh-CN"><head><title>CQNU Plant MAP</title><link rel="stylesheet" href="./renderer-dist/modern-shell.css"><link rel="stylesheet" href="/assets/workspace-gate.css"></head><body data-site-workspace="true"><div class="workspace-access-gate"></div><div id="modernUiRoot"></div><script src="/assets/workspace-gate.js"></script></body></html>';

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
  assert.match(workspace, /workspace-access-gate/);
  assert.match(workspace, /assets\/workspace-gate\.js/);
  assert.doesNotMatch(workspace, /<script src="\.\/renderer-dist\/modern-shell\.js"><\/script>/);
});

test('research hub is operational navigation rather than a marketing shell', () => {
  const home = renderPages({ workspaceHtml })['/'];
  assert.match(home, /CQNU Research Hub/);
  assert.match(home, /data-hub-search/);
  assert.match(home, /href="\/workspace"/);
  assert.match(home, /href="\/manage"/);
  assert.match(home, /待接入/);
  assert.match(home, /<kbd>Ctrl K<\/kbd>/);
  assert.match(home, /aria-live="polite"/);
});

test('navigation client supports keyboard search and complete mobile dismissal', async () => {
  const client = await readFile(new URL('../src/client.js', import.meta.url), 'utf8');
  assert.match(client, /event\.key === 'Escape'/);
  assert.match(client, /event\.ctrlKey \|\| event\.metaKey/);
  assert.match(client, /pointerdown/);
  assert.match(client, /matchMedia\('\(max-width: 700px\)'\)/);
});

test('management UI keeps login and member administration in a separate shell', async () => {
  const source = await readFile(new URL('../../admin/ui/index.html', import.meta.url), 'utf8');
  const client = await readFile(new URL('../../admin/ui/manage.js', import.meta.url), 'utf8');
  assert.match(source, /data-auth-stage/);
  assert.match(source, /data-manage-shell/);
  assert.match(source, /data-member-rows/);
  assert.match(source, /assets\/manage\.js/);
  assert.match(client, /\.\/manage-api\.js/);
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

test('documentation states browser degradation and external ZIP safety boundaries', () => {
  const docs = renderPages({ workspaceHtml })['/docs'];
  assert.match(docs, /Chromium、Firefox 与 Safari/);
  assert.match(docs, /路径、加密、条目数量、解压体积、JSON 结构、图片类型与 CRC 校验/);
  assert.match(docs, /不会静默改用远程存储/);
  assert.match(docs, /只读权限可打开项目、浏览、查询、统计和导出/);
  assert.match(docs, /账户服务只保存认证、权限和安全审计信息/);
});
