import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteMeta } from '../src/content.mjs';
import { renderPages } from '../src/render.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(projectRoot, '../app');
const distRoot = resolve(projectRoot, 'dist');
const distRelative = relative(projectRoot, distRoot);
if (!distRelative || distRelative.startsWith('..') || distRelative.includes(':')) {
  throw new Error('Refusing to clean a dist path outside the site workspace.');
}

const [styles, client, appIndex, logo, preview, workspaceServiceWorker, workspaceManifest, hostingConfig] = await Promise.all([
  readFile(resolve(projectRoot, 'src/styles.css'), 'utf8'),
  readFile(resolve(projectRoot, 'src/client.js'), 'utf8'),
  readFile(resolve(appRoot, 'index.html'), 'utf8'),
  readFile(resolve(projectRoot, 'public/cqnu-logo.svg'), 'utf8'),
  readFile(resolve(projectRoot, 'public/app-preview.png')),
  readFile(resolve(projectRoot, 'public/workspace-service-worker.js'), 'utf8'),
  readFile(resolve(projectRoot, 'public/workspace.webmanifest'), 'utf8'),
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

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt']);
const appAssets = {};

async function collectAppAssets(directory, publicPrefix) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collectAppAssets(absolutePath, `${publicPrefix}/${entry.name}`);
      continue;
    }
    if (!entry.isFile()) continue;
    const path = `${publicPrefix}/${entry.name}`.replaceAll(sep, '/');
    const extension = extname(entry.name).toLowerCase();
    const value = await readFile(absolutePath);
    appAssets[path] = textExtensions.has(extension)
      ? { encoding: 'text', body: value.toString('utf8') }
      : { encoding: 'base64', body: value.toString('base64') };
  }
}

appAssets['/style.css'] = { encoding: 'text', body: await readFile(resolve(appRoot, 'style.css'), 'utf8') };
appAssets['/workspace-service-worker.js'] = { encoding: 'text', body: workspaceServiceWorker };
appAssets['/workspace.webmanifest'] = { encoding: 'text', body: workspaceManifest };
await collectAppAssets(resolve(appRoot, 'renderer-dist'), '/renderer-dist');
await collectAppAssets(resolve(appRoot, 'src/renderer'), '/src/renderer');
await collectAppAssets(resolve(appRoot, 'node_modules/leaflet/dist'), '/node_modules/leaflet/dist');
await collectAppAssets(resolve(appRoot, 'node_modules/leaflet-draw/dist'), '/node_modules/leaflet-draw/dist');

for (const [assetPath, asset] of Object.entries(appAssets)) {
  if (!assetPath.startsWith('/renderer-dist/assets/')) continue;
  appAssets[assetPath.replace('/renderer-dist/assets/', '/assets/')] = asset;
  delete appAssets[assetPath];
}

const appAssetBytes = Object.values(appAssets)
  .reduce((total, asset) => total + Buffer.byteLength(asset.body), 0);
const workerSource = `const PAGES = ${JSON.stringify(pages)};
const STYLES = ${JSON.stringify(styles)};
const CLIENT = ${JSON.stringify(client)};
const LOGO = ${JSON.stringify(logo)};
const PREVIEW = ${JSON.stringify(preview.toString('base64'))};
const APP_ASSETS = ${JSON.stringify(appAssets)};
const SITE_VERSION = ${JSON.stringify(siteMeta.version)};

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

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function response(body, contentType, status = 200, cacheControl = 'public, max-age=300', headers = documentSecurityHeaders) {
  return new Response(body, { status, headers: { ...headers, 'content-type': contentType, 'cache-control': cacheControl } });
}

function binaryFromBase64(value) {
  const raw = atob(value);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\\/$/, '') : '/';
    if (request.method !== 'GET' && request.method !== 'HEAD') return response('Method not allowed', 'text/plain; charset=utf-8', 405, 'no-store');
    if (path === '/health') return response(JSON.stringify({ ok: true, version: SITE_VERSION }), 'application/json; charset=utf-8', 200, 'no-store');
    if (path === '/robots.txt') return response('User-agent: *\\nAllow: /\\n', 'text/plain; charset=utf-8');
    if (path === '/assets/styles.css') return response(STYLES, 'text/css; charset=utf-8', 200, 'public, max-age=86400');
    if (path === '/assets/client.js') return response(CLIENT, 'text/javascript; charset=utf-8', 200, 'public, max-age=86400');
    if (path === '/assets/cqnu-logo.svg') return response(LOGO, 'image/svg+xml; charset=utf-8', 200, 'public, max-age=86400');
    if (path === '/assets/app-preview.png') return response(binaryFromBase64(PREVIEW), 'image/png', 200, 'public, max-age=86400');
    const appAsset = APP_ASSETS[path];
    if (appAsset) {
      const extension = path.includes('.') ? path.slice(path.lastIndexOf('.')).toLowerCase() : '';
      const body = appAsset.encoding === 'base64' ? binaryFromBase64(appAsset.body) : appAsset.body;
      const assetHeaders = path === '/workspace-service-worker.js'
        ? { ...workspaceSecurityHeaders, 'service-worker-allowed': '/' }
        : workspaceSecurityHeaders;
      return response(body, contentTypes[extension] || 'application/octet-stream', 200, 'public, max-age=86400', assetHeaders);
    }
    const page = PAGES[path];
    if (page) return response(
      request.method === 'HEAD' ? null : page,
      'text/html; charset=utf-8',
      200,
      'public, max-age=300',
      path === '/workspace' ? workspaceSecurityHeaders : documentSecurityHeaders
    );
    return response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>页面未找到</title><body><main><h1>页面未找到</h1><p><a href="/">返回首页</a></p></main></body></html>', 'text/html; charset=utf-8', 404, 'no-store');
  }
};
`;

await rm(distRoot, { recursive: true, force: true });
await mkdir(resolve(distRoot, 'server'), { recursive: true });
await mkdir(resolve(distRoot, '.openai'), { recursive: true });
await writeFile(resolve(distRoot, 'server/index.js'), workerSource, 'utf8');
await writeFile(resolve(distRoot, '.openai/hosting.json'), hostingConfig, 'utf8');
console.log(`Built ${Object.keys(pages).length} site routes and ${Object.keys(appAssets).length} workspace assets (${appAssetBytes} encoded bytes) in ${distRoot}`);
