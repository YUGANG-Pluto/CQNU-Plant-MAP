import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { siteMeta } from '../src/content.mjs';
import { renderPages } from '../src/render.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(projectRoot, '../app');
const adminRoot = resolve(projectRoot, '../admin');
const adminDistRoot = resolve(adminRoot, 'dist');
const distRoot = resolve(projectRoot, 'dist');
const clientRoot = resolve(distRoot, 'client');
const distRelative = relative(projectRoot, distRoot);
if (!distRelative || distRelative.startsWith('..') || distRelative.includes(':')) {
  throw new Error('Refusing to clean a dist path outside the site workspace.');
}

const managementUiModuleNames = (await readdir(resolve(adminDistRoot, 'ui'), { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
  .map(entry => entry.name)
  .sort();
if (!managementUiModuleNames.includes('manage.js')) {
  throw new Error('Compiled management UI entry is missing.');
}

const [styles, pageExperienceStyles, responsiveStyles, client, workspaceGateCss, workspaceGateClient, appIndex, legacyLoaderSource, manageHtml, manageCss, managementUiModules, profileStorage, hostingConfig] = await Promise.all([
  readFile(resolve(projectRoot, 'src/styles.css'), 'utf8'),
  readFile(resolve(projectRoot, 'src/page-experience.css'), 'utf8'),
  readFile(resolve(projectRoot, 'src/responsive.css'), 'utf8'),
  readFile(resolve(projectRoot, 'src/client.js'), 'utf8'),
  readFile(resolve(projectRoot, 'src/workspace-gate.css'), 'utf8'),
  readFile(resolve(projectRoot, 'src/workspace-gate.js'), 'utf8'),
  readFile(resolve(appRoot, 'index.html'), 'utf8'),
  readFile(resolve(appRoot, 'src/renderer/legacy-loader.js'), 'utf8'),
  readFile(resolve(adminRoot, 'ui/index.html'), 'utf8'),
  readFile(resolve(adminRoot, 'ui/manage.css'), 'utf8'),
  Promise.all(managementUiModuleNames.map(async name => ({
    name,
    source: await readFile(resolve(adminDistRoot, 'ui', name), 'utf8')
  }))),
  readFile(resolve(adminRoot, 'ui/profile-storage.js'), 'utf8'),
  readFile(resolve(projectRoot, '.openai/hosting.json'), 'utf8')
]);

JSON.parse(hostingConfig);

async function buildLegacyRuntimeBundle() {
  const context = { CQNU_LEGACY_RUNTIME_MANIFEST_ONLY: true };
  runInNewContext(legacyLoaderSource, context, { filename: 'legacy-loader.js' });
  const sources = Array.from(context.CQNU_LEGACY_RUNTIME_SOURCES || []);
  if (!sources.length) throw new Error('Legacy renderer source manifest is empty.');

  const modules = await Promise.all(sources.map(async source => {
    const relativeSource = String(source).replace(/^\.\//, '');
    const absoluteSource = resolve(appRoot, relativeSource);
    const relativeToApp = relative(appRoot, absoluteSource);
    if (!relativeToApp || relativeToApp.startsWith('..') || relativeToApp.includes(':')) {
      throw new Error(`Legacy renderer source escapes app root: ${source}`);
    }
    return {
      source,
      code: await readFile(absoluteSource, 'utf8')
    };
  }));

  return [
    "document.documentElement.dataset.runtimeStatus = 'loading';",
    ...modules.map(({ source, code }) => `\n/* ${source} */\n${code}\n;`),
    "\ndocument.documentElement.dataset.runtimeStatus = 'ready';\n"
  ].join('\n');
}

const legacyRuntimeBundle = await buildLegacyRuntimeBundle();
const workspaceResourceHints = [
  '<link rel="preload" href="/renderer-dist/modern-shell.js" as="script" />',
  '<link rel="preload" href="/node_modules/leaflet/dist/leaflet.js" as="script" />',
  '<link rel="preload" href="/assets/legacy-runtime.js" as="script" />'
].join('\n  ');
const workspaceHtml = appIndex
  .replace('  <script src="./renderer-dist/modern-shell.js"></script>\n', '')
  .replace('  <script src="./node_modules/leaflet/dist/leaflet.js"></script>\n', '')
  .replace('  <script src="./node_modules/leaflet-draw/dist/leaflet.draw.js"></script>\n', '')
  .replace('  <script defer src="./src/renderer/legacy-loader.js"></script>\n', '')
  .replace(
    "script-src 'self';",
    "script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:;"
  )
  .replace('</head>', `  ${workspaceResourceHints}\n  <link rel="manifest" href="/workspace.webmanifest" />\n  <link rel="stylesheet" href="/assets/workspace-gate.css" />\n</head>`)
  .replace('<body>', `<body data-site-workspace="true">
  <div class="workspace-access-gate" data-workspace-access-gate role="status" aria-live="polite">
    <div class="workspace-access-panel">
      <img src="/assets/cqnu-logo.svg" alt="" />
       <h1 data-gate-title>正在核对访问权限</h1>
       <p data-gate-message>植物项目数据仍保存在本机；管理服务只核对当前账户与会话。</p>
       <div class="workspace-gate-progress" role="progressbar" aria-label="工作区加载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="8" data-gate-progress>
         <span data-gate-progress-bar style="width: 8%"></span>
       </div>
       <small data-gate-stage>安全会话</small>
       <a href="/manage?next=/workspace" data-gate-action hidden>前往登录</a>
    </div>
  </div>`)
  .replace('</body>', '  <script src="/assets/profile-storage.js"></script>\n  <script src="/assets/workspace-gate.js"></script>\n</body>');
const managePageHtml = manageHtml.replace(
  '</head>',
  '  <link rel="prefetch" href="/renderer-dist/modern-shell.js" as="script" />\n  <link rel="prefetch" href="/assets/legacy-runtime.js" as="script" />\n</head>'
);
const pages = { ...renderPages({ workspaceHtml }), '/manage': managePageHtml };
const { managementSchemaSql } = await import('../../admin/dist/schema.js');
const schemaSource = `export const managementSchemaSql = ${JSON.stringify(managementSchemaSql)};\n`;

async function copyRendererAssets() {
  const rendererDist = resolve(appRoot, 'renderer-dist');
  const entries = await readdir(rendererDist, { withFileTypes: true });
  for (const entry of entries) {
    const source = resolve(rendererDist, entry.name);
    const target = entry.name === 'assets'
      ? resolve(clientRoot, 'assets')
      : resolve(clientRoot, 'renderer-dist', entry.name);
    await cp(source, target, { recursive: entry.isDirectory() });
  }
}

async function copyWorkspaceRuntimeAssets() {
  const leafletSource = resolve(appRoot, 'node_modules/leaflet/dist');
  const leafletDrawSource = resolve(appRoot, 'node_modules/leaflet-draw/dist');
  const leafletTarget = resolve(clientRoot, 'node_modules/leaflet/dist');
  const leafletDrawTarget = resolve(clientRoot, 'node_modules/leaflet-draw/dist');

  await Promise.all([
    mkdir(leafletTarget, { recursive: true }),
    mkdir(leafletDrawTarget, { recursive: true }),
    cp(resolve(appRoot, 'src/renderer/styles'), resolve(clientRoot, 'src/renderer/styles'), { recursive: true }),
    cp(resolve(appRoot, 'src/renderer/assets'), resolve(clientRoot, 'src/renderer/assets'), { recursive: true })
  ]);
  await Promise.all([
    cp(resolve(leafletSource, 'leaflet.css'), resolve(leafletTarget, 'leaflet.css')),
    cp(resolve(leafletSource, 'leaflet.js'), resolve(leafletTarget, 'leaflet.js')),
    cp(resolve(leafletSource, 'images'), resolve(leafletTarget, 'images'), { recursive: true }),
    cp(resolve(leafletDrawSource, 'leaflet.draw.css'), resolve(leafletDrawTarget, 'leaflet.draw.css')),
    cp(resolve(leafletDrawSource, 'leaflet.draw.js'), resolve(leafletDrawTarget, 'leaflet.draw.js')),
    cp(resolve(leafletDrawSource, 'images'), resolve(leafletDrawTarget, 'images'), { recursive: true })
  ]);
}

async function copyAdminServerAssets() {
  const entries = await readdir(adminDistRoot, { withFileTypes: true });
  await Promise.all(entries
    .filter(entry => entry.name !== 'ui')
    .map(entry => cp(
      resolve(adminDistRoot, entry.name),
      resolve(distRoot, 'server/admin', entry.name),
      { recursive: entry.isDirectory() }
    )));
}

async function collectFileMetrics(directory) {
  let count = 0;
  let bytes = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFileMetrics(path);
      count += nested.count;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      count += 1;
      bytes += (await stat(path)).size;
    }
  }
  return { count, bytes };
}

await rm(distRoot, { recursive: true, force: true });
await Promise.all([
  mkdir(resolve(distRoot, 'server'), { recursive: true }),
  mkdir(resolve(distRoot, 'server/admin'), { recursive: true }),
  mkdir(resolve(distRoot, 'db'), { recursive: true }),
  mkdir(resolve(distRoot, '.openai'), { recursive: true }),
  mkdir(resolve(clientRoot, 'assets'), { recursive: true }),
  mkdir(resolve(clientRoot, 'renderer-dist'), { recursive: true })
]);

await Promise.all([
  writeFile(resolve(clientRoot, 'assets/styles.css'), styles, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/page-experience.css'), pageExperienceStyles, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/responsive.css'), responsiveStyles, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/client.js'), client, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/workspace-gate.css'), workspaceGateCss, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/workspace-gate.js'), workspaceGateClient, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/legacy-runtime.js'), legacyRuntimeBundle, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/manage.css'), manageCss, 'utf8'),
  ...managementUiModules.map(({ name, source }) => (
    writeFile(resolve(clientRoot, 'assets', name), source, 'utf8')
  )),
  writeFile(resolve(clientRoot, 'assets/profile-storage.js'), profileStorage, 'utf8'),
  writeFile(resolve(distRoot, 'db/schema.ts'), schemaSource, 'utf8'),
  copyAdminServerAssets(),
  cp(resolve(projectRoot, 'public/cqnu-logo.svg'), resolve(clientRoot, 'assets/cqnu-logo.svg')),
  cp(resolve(projectRoot, 'public/app-preview.png'), resolve(clientRoot, 'assets/app-preview.png')),
  cp(resolve(projectRoot, 'public/workspace-service-worker.js'), resolve(clientRoot, 'workspace-service-worker.js')),
  cp(resolve(projectRoot, 'public/workspace.webmanifest'), resolve(clientRoot, 'workspace.webmanifest')),
  cp(resolve(appRoot, 'style.css'), resolve(clientRoot, 'style.css')),
  copyWorkspaceRuntimeAssets(),
  copyRendererAssets()
]);

const clientMetrics = await collectFileMetrics(clientRoot);
const workerSource = `import { handleManagementRequest } from './admin/site-handler.js';

const PAGES = ${JSON.stringify(pages)};
const SITE_VERSION = ${JSON.stringify(siteMeta.version)};
const SITE_CHANNEL = 'web/main';
const ARTIFACT_VERSION = 3;
const CLIENT_ASSET_COUNT = ${clientMetrics.count};

const documentSecurityHeaders = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'",
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY'
};

const workspaceSecurityHeaders = {
  ...documentSecurityHeaders,
  'content-security-policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https: data:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'; frame-src 'none'"
};

const managementSecurityHeaders = {
  ...documentSecurityHeaders,
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
};

const managementUiAssetPaths = ${JSON.stringify(managementUiModuleNames.map(name => `/assets/${name}`))};
const siteAssetPaths = new Set([
  '/assets/styles.css',
  '/assets/page-experience.css',
  '/assets/responsive.css',
  '/assets/client.js',
  '/assets/workspace-gate.css',
  '/assets/workspace-gate.js',
  '/assets/manage.css',
  ...managementUiAssetPaths,
  '/assets/profile-storage.js',
  '/assets/cqnu-logo.svg',
  '/assets/app-preview.png'
]);

function response(body, contentType, status = 200, cacheControl = 'public, max-age=300', headers = documentSecurityHeaders) {
  return new Response(body, { status, headers: { ...headers, 'content-type': contentType, 'cache-control': cacheControl } });
}

function isWorkspaceAsset(path) {
  return !siteAssetPaths.has(path) && (
    path === '/style.css'
    || path === '/workspace-service-worker.js'
    || path === '/workspace.webmanifest'
    || path.startsWith('/assets/')
    || path.startsWith('/renderer-dist/')
    || path.startsWith('/src/renderer/')
    || path.startsWith('/node_modules/')
  );
}

function assetCacheControl(path) {
  if (path === '/workspace-service-worker.js') return 'no-cache';
  if (/\\\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9]+$/.test(path)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=86400';
}

async function staticAsset(request, env, path) {
  if (!env?.ASSETS?.fetch) return null;
  const asset = await env.ASSETS.fetch(request);
  if (!asset || asset.status === 404) return null;
  const headers = new Headers(asset.headers);
  const securityHeaders = isWorkspaceAsset(path) ? workspaceSecurityHeaders : documentSecurityHeaders;
  Object.entries(securityHeaders).forEach(([name, value]) => headers.set(name, value));
  headers.set('cache-control', assetCacheControl(path));
  if (path === '/workspace-service-worker.js') headers.set('service-worker-allowed', '/');
  return new Response(request.method === 'HEAD' ? null : asset.body, {
    status: asset.status,
    statusText: asset.statusText,
    headers
  });
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 && url.pathname.endsWith('/')
      ? url.pathname.slice(0, -1)
      : url.pathname;
    if (path.startsWith('/api/manage/')) {
      return handleManagementRequest(request, env);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return response('Method not allowed', 'text/plain; charset=utf-8', 405, 'no-store');
    }
    if (path === '/health') return response(JSON.stringify({
      ok: true,
      version: SITE_VERSION,
      channel: SITE_CHANNEL,
      artifactVersion: ARTIFACT_VERSION,
      clientAssetCount: CLIENT_ASSET_COUNT
    }), 'application/json; charset=utf-8', 200, 'no-store');
    if (path === '/robots.txt') return response('User-agent: *\\nAllow: /\\n', 'text/plain; charset=utf-8');
    const page = PAGES[path];
    if (page) return response(
      request.method === 'HEAD' ? null : page,
      'text/html; charset=utf-8',
      200,
      'public, max-age=300',
      path === '/workspace'
        ? workspaceSecurityHeaders
        : path === '/manage'
          ? managementSecurityHeaders
          : documentSecurityHeaders
    );
    const asset = await staticAsset(request, env, path);
    if (asset) return asset;
    return response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>页面未找到</title><body><main><h1>页面未找到</h1><p><a href="/">返回首页</a></p></main></body></html>', 'text/html; charset=utf-8', 404, 'no-store');
  }
};
`;

await writeFile(resolve(distRoot, 'server/index.js'), workerSource, 'utf8');
await writeFile(resolve(distRoot, '.openai/hosting.json'), hostingConfig, 'utf8');
const workerBytes = Buffer.byteLength(workerSource);
console.log(
  `Built ${Object.keys(pages).length} routes, ${clientMetrics.count} client assets (${clientMetrics.bytes} bytes), and a ${workerBytes}-byte Worker in ${distRoot}`
);
