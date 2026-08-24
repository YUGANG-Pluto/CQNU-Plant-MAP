import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteMeta } from '../src/content.mjs';
import { renderPages } from '../src/render.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(projectRoot, '../app');
const distRoot = resolve(projectRoot, 'dist');
const clientRoot = resolve(distRoot, 'client');
const distRelative = relative(projectRoot, distRoot);
if (!distRelative || distRelative.startsWith('..') || distRelative.includes(':')) {
  throw new Error('Refusing to clean a dist path outside the site workspace.');
}

const [styles, client, appIndex, hostingConfig] = await Promise.all([
  readFile(resolve(projectRoot, 'src/styles.css'), 'utf8'),
  readFile(resolve(projectRoot, 'src/client.js'), 'utf8'),
  readFile(resolve(appRoot, 'index.html'), 'utf8'),
  readFile(resolve(projectRoot, '.openai/hosting.json'), 'utf8')
]);

JSON.parse(hostingConfig);
const workspaceHtml = appIndex
  .replace(
    "script-src 'self';",
    "script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:;"
  )
  .replace('</head>', '  <link rel="manifest" href="/workspace.webmanifest" />\n</head>')
  .replace('<body>', '<body data-site-workspace="true">');
const pages = renderPages({ workspaceHtml });

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
  mkdir(resolve(distRoot, '.openai'), { recursive: true }),
  mkdir(resolve(clientRoot, 'assets'), { recursive: true }),
  mkdir(resolve(clientRoot, 'renderer-dist'), { recursive: true })
]);

await Promise.all([
  writeFile(resolve(clientRoot, 'assets/styles.css'), styles, 'utf8'),
  writeFile(resolve(clientRoot, 'assets/client.js'), client, 'utf8'),
  cp(resolve(projectRoot, 'public/cqnu-logo.svg'), resolve(clientRoot, 'assets/cqnu-logo.svg')),
  cp(resolve(projectRoot, 'public/app-preview.png'), resolve(clientRoot, 'assets/app-preview.png')),
  cp(resolve(projectRoot, 'public/workspace-service-worker.js'), resolve(clientRoot, 'workspace-service-worker.js')),
  cp(resolve(projectRoot, 'public/workspace.webmanifest'), resolve(clientRoot, 'workspace.webmanifest')),
  cp(resolve(appRoot, 'style.css'), resolve(clientRoot, 'style.css')),
  cp(resolve(appRoot, 'src/renderer'), resolve(clientRoot, 'src/renderer'), { recursive: true }),
  cp(resolve(appRoot, 'node_modules/leaflet/dist'), resolve(clientRoot, 'node_modules/leaflet/dist'), { recursive: true }),
  cp(resolve(appRoot, 'node_modules/leaflet-draw/dist'), resolve(clientRoot, 'node_modules/leaflet-draw/dist'), { recursive: true }),
  copyRendererAssets()
]);

const clientMetrics = await collectFileMetrics(clientRoot);
const workerSource = `const PAGES = ${JSON.stringify(pages)};
const SITE_VERSION = ${JSON.stringify(siteMeta.version)};
const SITE_CHANNEL = 'web/main';
const ARTIFACT_VERSION = 2;
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

const siteAssetPaths = new Set([
  '/assets/styles.css',
  '/assets/client.js',
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
      path === '/workspace' ? workspaceSecurityHeaders : documentSecurityHeaders
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
