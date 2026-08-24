import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(projectRoot, 'dist');
const clientRoot = resolve(distRoot, 'client');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function clientPath(pathname) {
  let decoded = '';
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return '';
  }
  const absolute = resolve(clientRoot, decoded.replace(/^\/+/, ''));
  const local = relative(clientRoot, absolute);
  return !local || local.startsWith('..') || local.includes(':') ? '' : absolute;
}

export function createLocalAssetsBinding() {
  return Object.freeze({
    async fetch(request) {
      const path = clientPath(new URL(request.url).pathname);
      if (!path) return new Response('Not found', { status: 404 });
      try {
        if (!(await stat(path)).isFile()) return new Response('Not found', { status: 404 });
        const body = request.method === 'HEAD' ? null : await readFile(path);
        return new Response(body, {
          headers: {
            'content-type': contentTypes[extname(path).toLowerCase()] || 'application/octet-stream'
          }
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    }
  });
}

export async function createLocalSiteRuntime() {
  const source = await readFile(resolve(distRoot, 'server/index.js'), 'utf8');
  const workerUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const worker = (await import(workerUrl)).default;
  return {
    worker,
    env: Object.freeze({ ASSETS: createLocalAssetsBinding() })
  };
}
