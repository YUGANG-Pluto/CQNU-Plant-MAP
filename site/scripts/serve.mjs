import { createServer } from 'node:http';
import { createLocalSiteRuntime } from './local-runtime.mjs';

const { worker, env } = await createLocalSiteRuntime();
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);

const server = createServer(async (request, response) => {
  try {
    const target = new URL(request.url || '/', `http://${host}:${port}`);
    const siteResponse = await worker.fetch(
      new Request(target, { method: request.method || 'GET' }),
      env
    );
    response.writeHead(siteResponse.status, Object.fromEntries(siteResponse.headers));
    response.end(Buffer.from(await siteResponse.arrayBuffer()));
  } catch {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Local preview failed.');
  }
});

server.listen(port, host, () => {
  console.log(`CQNU Plant MAP site preview: http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
