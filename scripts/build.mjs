import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPages } from '../src/render.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(projectRoot, 'dist');
const distRelative = relative(projectRoot, distRoot);
if (!distRelative || distRelative.startsWith('..') || distRelative.includes(':')) {
  throw new Error('Refusing to clean a dist path outside the site workspace.');
}

const [styles, client, logo, preview, hostingConfig] = await Promise.all([
  readFile(resolve(projectRoot, 'src/styles.css'), 'utf8'),
  readFile(resolve(projectRoot, 'src/client.js'), 'utf8'),
  readFile(resolve(projectRoot, 'public/cqnu-logo.svg'), 'utf8'),
  readFile(resolve(projectRoot, 'public/app-preview.png')),
  readFile(resolve(projectRoot, '.openai/hosting.json'), 'utf8')
]);

JSON.parse(hostingConfig);
const pages = renderPages();
const workerSource = `const PAGES = ${JSON.stringify(pages)};
const STYLES = ${JSON.stringify(styles)};
const CLIENT = ${JSON.stringify(client)};
const LOGO = ${JSON.stringify(logo)};
const PREVIEW = ${JSON.stringify(preview.toString('base64'))};

const securityHeaders = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'",
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY'
};

function response(body, contentType, status = 200, cacheControl = 'public, max-age=300') {
  return new Response(body, { status, headers: { ...securityHeaders, 'content-type': contentType, 'cache-control': cacheControl } });
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
    if (path === '/health') return response(JSON.stringify({ ok: true, version: '1.0.0' }), 'application/json; charset=utf-8', 200, 'no-store');
    if (path === '/robots.txt') return response('User-agent: *\\nAllow: /\\n', 'text/plain; charset=utf-8');
    if (path === '/assets/styles.css') return response(STYLES, 'text/css; charset=utf-8', 200, 'public, max-age=86400');
    if (path === '/assets/client.js') return response(CLIENT, 'text/javascript; charset=utf-8', 200, 'public, max-age=86400');
    if (path === '/assets/cqnu-logo.svg') return response(LOGO, 'image/svg+xml; charset=utf-8', 200, 'public, max-age=86400');
    if (path === '/assets/app-preview.png') return response(binaryFromBase64(PREVIEW), 'image/png', 200, 'public, max-age=86400');
    const page = PAGES[path];
    if (page) return response(request.method === 'HEAD' ? null : page, 'text/html; charset=utf-8');
    return response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>页面未找到</title><body><main><h1>页面未找到</h1><p><a href="/">返回首页</a></p></main></body></html>', 'text/html; charset=utf-8', 404, 'no-store');
  }
};
`;

await rm(distRoot, { recursive: true, force: true });
await mkdir(resolve(distRoot, 'server'), { recursive: true });
await mkdir(resolve(distRoot, '.openai'), { recursive: true });
await writeFile(resolve(distRoot, 'server/index.js'), workerSource, 'utf8');
await writeFile(resolve(distRoot, '.openai/hosting.json'), hostingConfig, 'utf8');
console.log(`Built ${Object.keys(pages).length} site routes in ${distRoot}`);
