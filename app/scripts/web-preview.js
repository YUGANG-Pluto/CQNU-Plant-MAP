const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4174);
const allowedFiles = new Set(['index.html', 'style.css']);
const allowedPrefixes = [
  'renderer-dist/',
  'src/renderer/',
  'node_modules/leaflet/dist/',
  'node_modules/leaflet-draw/dist/'
];
const contentTypes = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8'
});

function send(response, status, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': contentType,
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff'
  });
  response.end(body);
}

function safeRelativePath(urlValue) {
  const pathname = decodeURIComponent(new URL(urlValue || '/', `http://${host}:${port}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '').replaceAll('\\', '/');
  if (relative.split('/').some(segment => segment === '.' || segment === '..')) return '';
  if (!allowedFiles.has(relative) && !allowedPrefixes.some(prefix => relative.startsWith(prefix))) return '';
  const filePath = path.resolve(root, relative);
  const rootPrefix = `${root}${path.sep}`;
  if (filePath !== root && !filePath.startsWith(rootPrefix)) return '';
  return filePath;
}

function createPreviewServer() {
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
      send(response, 405, 'Method not allowed');
      return;
    }
    let filePath = '';
    try {
      filePath = safeRelativePath(request.url);
    } catch {
      send(response, 400, 'Invalid request path');
      return;
    }
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      send(response, 404, 'Not found');
      return;
    }
    const contentType = contentTypes[path.extname(filePath).toLocaleLowerCase()] || 'application/octet-stream';
    if (request.method === 'HEAD') {
      send(response, 200, null, contentType);
      return;
    }
    send(response, 200, fs.readFileSync(filePath), contentType);
  });
}

if (require.main === module) {
  const server = createPreviewServer();
  server.listen(port, host, () => {
    console.log(`CQNU Plant MAP browser preview: http://${host}:${port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
}

module.exports = {
  host,
  port,
  safeRelativePath,
  createPreviewServer
};
