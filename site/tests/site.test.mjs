import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderPages } from '../src/render.mjs';
import { findSiteApplication, siteApplications } from '../src/apps/registry.mjs';

const workspaceHtml =
  '<!doctype html><html lang="zh-CN"><head><title>CQNU Plant MAP</title><link rel="preload" href="/assets/legacy-runtime.js" as="script"><link rel="stylesheet" href="./renderer-dist/modern-shell.css"><link rel="stylesheet" href="/assets/workspace-gate.css"></head><body data-site-workspace="true"><div class="workspace-access-gate"></div><div id="modernUiRoot"></div><script src="/assets/workspace-gate.js"></script></body></html>';

async function readSiteStyles() {
  const sources = await Promise.all([
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/page-experience.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/responsive.css', import.meta.url), 'utf8')
  ]);
  return sources.join('\n');
}

test('site routes render complete branded documents', () => {
  const pages = renderPages({ workspaceHtml });
  assert.deepEqual(Object.keys(pages), [
    '/',
    '/workspace',
    '/docs',
    '/web',
    '/release',
    '/privacy',
    '/apps/project-inspector'
  ]);
  Object.values(pages).forEach(page => {
    assert.match(page, /^<!doctype html>/);
    assert.match(page, /CQNU Plant MAP/);
    assert.match(page, /(?:assets\/styles|renderer-dist\/modern-shell)\.css/);
    assert.doesNotMatch(page, /undefined|null|NaN/);
  });
});

test('site application registry exposes a local-only versioned host contract', async () => {
  const application = findSiteApplication('/apps/project-inspector');
  const client = await readFile(new URL('../src/apps/project-inspector.js', import.meta.url), 'utf8');
  assert.equal(siteApplications.length, 1);
  assert.ok(Object.isFrozen(siteApplications));
  assert.ok(Object.isFrozen(application));
  assert.equal(application.execution, 'browser-local');
  assert.equal(application.dataPolicy.network, 'none');
  assert.equal(application.dataPolicy.upload, false);
  assert.match(application.version, /^\d+\.\d+\.\d+$/u);
  assert.doesNotMatch(client, /\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|indexedDB/u);
  assert.match(client, /SQLite format 3/);
  assert.match(client, /webkitRelativePath/);
  assert.match(client, /project_preflight_/);
});

test('project inspector renders a functional local file surface', () => {
  const page = renderPages({ workspaceHtml })['/apps/project-inspector'];
  assert.match(page, /site-page--app-inspector/);
  assert.match(page, /data-project-directory-input/);
  assert.match(page, /data-project-file-input/);
  assert.match(page, /data-project-export/);
  assert.match(page, /assets\/apps\.css/);
  assert.match(page, /assets\/project-inspector\.js/);
  assert.match(page, /不上传/);
});

test('workspace route receives the complete shared application document', () => {
  const workspace = renderPages({ workspaceHtml })['/workspace'];
  assert.match(workspace, /data-site-workspace="true"/);
  assert.match(workspace, /modernUiRoot/);
  assert.match(workspace, /workspace-access-gate/);
  assert.match(workspace, /assets\/workspace-gate\.js/);
  assert.match(workspace, /assets\/legacy-runtime\.js/);
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

test('site motion uses a real progressive reveal with a reduced-motion fallback', async () => {
  const client = await readFile(new URL('../src/client.js', import.meta.url), 'utf8');
  const styles = await readSiteStyles();
  assert.match(client, /motion-reveal-ready/);
  assert.match(client, /requestAnimationFrame/);
  assert.match(styles, /--motion-reveal:\s*720ms/);
  assert.match(styles, /\.motion-reveal-ready \[data-reveal\][\s\S]*opacity:\s*0/);
  assert.match(styles, /prefers-reduced-motion:[\s\S]*opacity:\s*1/);
});

test('site sections use content-specific palettes over shared material primitives', async () => {
  const pages = renderPages({ workspaceHtml });
  const styles = await readSiteStyles();
  assert.match(pages['/'], /class="[^"]*site-page--home/);
  assert.match(pages['/docs'], /class="[^"]*site-page--docs/);
  assert.match(pages['/web'], /class="[^"]*site-page--architecture/);
  assert.match(pages['/release'], /class="[^"]*site-page--release/);
  assert.match(pages['/privacy'], /class="[^"]*site-page--privacy/);
  assert.match(pages['/docs'], /assets\/page-experience\.css/);
  assert.match(pages['/docs'], /assets\/responsive\.css/);
  assert.match(styles, /\.site-page--home\s*\{[\s\S]*?--accent:\s*#176b45/);
  assert.match(styles, /\.site-page--docs\s*\{[\s\S]*?--accent:\s*#2c64a1/);
  assert.match(styles, /\.site-page--release\s*\{[\s\S]*?--accent:\s*#8f4d65/);
  assert.match(styles, /prefers-reduced-transparency:[\s\S]*-webkit-backdrop-filter:\s*none/);
});

test('documentation shell includes reading progress and section-aware floating navigation', async () => {
  const docs = renderPages({ workspaceHtml })['/docs'];
  const client = await readFile(new URL('../src/client.js', import.meta.url), 'utf8');
  assert.match(docs, /data-doc-progress/);
  assert.match(docs, /data-doc-link/);
  assert.match(docs, /data-doc-section/);
  assert.match(docs, /doc-float-actions/);
  assert.match(client, /syncDocumentProgress/);
  assert.match(client, /docObserver/);
  assert.match(client, /aria-current/);
});

test('management UI keeps login and member administration in a separate shell', async () => {
  const source = await readFile(new URL('../../admin/ui/index.html', import.meta.url), 'utf8');
  const client = await readFile(new URL('../../admin/src/ui/manage.ts', import.meta.url), 'utf8');
  const context = await readFile(new URL('../../admin/src/ui/manage-context.ts', import.meta.url), 'utf8');
  const session = await readFile(new URL('../../admin/src/ui/manage-session.ts', import.meta.url), 'utf8');
  const members = await readFile(new URL('../../admin/src/ui/manage-members.ts', import.meta.url), 'utf8');
  const profileController = await readFile(new URL('../../admin/src/ui/manage-profile.ts', import.meta.url), 'utf8');
  const dom = await readFile(new URL('../../admin/src/ui/manage-dom.ts', import.meta.url), 'utf8');
  const profile = await readFile(new URL('../../admin/ui/profile-storage.js', import.meta.url), 'utf8');
  assert.match(source, /data-auth-stage/);
  assert.match(source, /data-manage-shell/);
  assert.match(source, /data-member-rows/);
  assert.match(source, /data-avatar-input/);
  assert.match(source, /minlength="6"/);
  assert.doesNotMatch(source, /minlength="12"/);
  assert.match(source, /assets\/profile-storage\.js/);
  assert.match(source, /assets\/manage\.js/);
  assert.match(client, /\.\/manage-session\.js/);
  assert.match(context, /\.\/manage-dom\.js/);
  assert.match(context, /export function safeNextPath/);
  assert.match(context, /\^\\\/\(workspace\|manage\)\$/);
  assert.match(session, /location\.replace\('\/workspace'\)/);
  assert.match(members, /managementApi\.listMembers/);
  assert.match(profileController, /cqnuLocalProfile|localProfile/);
  for (const moduleSource of [context, session, members, profileController, dom]) {
    assert.ok(moduleSource.split(/\r?\n/).length <= 360, 'Management UI modules should stay below 360 lines');
  }
  assert.match(profile, /MAX_SOURCE_BYTES/);
  assert.match(profile, /localStorage/);
  assert.doesNotMatch(profile, /fetch\(|\/api\/manage/);
});

test('management shell uses a distinct ice-blue functional layer and solid data surfaces', async () => {
  const styles = await readFile(new URL('../../admin/ui/manage.css', import.meta.url), 'utf8');
  assert.match(styles, /--primary:\s*#2f66a5/);
  assert.match(styles, /--paper:\s*#f4f7fb/);
  assert.match(styles, /\.manage-topbar\s*\{[\s\S]*backdrop-filter:/);
  assert.match(styles, /\.manage-sidebar\s*\{[\s\S]*backdrop-filter:/);
  assert.match(styles, /\.data-panel\s*\{[\s\S]*background:\s*var\(--surface\)/);
  assert.match(styles, /\.manage-nav button\[aria-current='page'\][\s\S]*box-shadow:/);
  assert.match(styles, /prefers-reduced-transparency:[\s\S]*backdrop-filter:\s*none/);
  assert.doesNotMatch(styles, /--primary:\s*#176b45/);
});

test('workspace access bridge carries only a local avatar preference', async () => {
  const gate = await readFile(new URL('../src/workspace-gate.js', import.meta.url), 'utf8');
  assert.match(gate, /cqnuLocalProfile\?\.read\(data\.account\.id\)/);
  assert.match(gate, /avatarDataUrl/);
  assert.doesNotMatch(gate, /avatarDataUrl[\s\S]{0,120}fetch\(/);
});

test('workspace startup uses staged progress and one bundled legacy runtime request', async () => {
  const gate = await readFile(new URL('../src/workspace-gate.js', import.meta.url), 'utf8');
  const build = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  assert.match(gate, /Promise\.all\(\[/);
  assert.match(gate, /assets\/legacy-runtime\.js/);
  assert.doesNotMatch(gate, /src\/renderer\/legacy-loader\.js/);
  assert.match(gate, /updateProgress\(100/);
  assert.match(build, /CQNU_LEGACY_RUNTIME_SOURCES/);
  assert.match(build, /legacyRuntimeBundle/);
  assert.match(build, /copyWorkspaceRuntimeAssets/);
  assert.match(build, /readdir\(resolve\(adminDistRoot, ["']ui["']\)/);
  assert.match(build, /Compiled management UI entry is missing/);
  assert.doesNotMatch(build, /cp\(resolve\(appRoot, ["']src\/renderer["']\),/);
  assert.doesNotMatch(build, /cp\(resolve\(appRoot, ["']node_modules\/leaflet\/dist["']\),/);
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
