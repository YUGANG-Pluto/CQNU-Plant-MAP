const CACHE_NAME = 'cqnu-plant-map-workspace-v2';
const cacheablePrefixes = [
  '/assets/',
  '/node_modules/leaflet/',
  '/node_modules/leaflet-draw/',
  '/renderer-dist/',
  '/src/renderer/'
];
const cacheableFiles = new Set(['/workspace', '/style.css', '/workspace.webmanifest']);

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('cqnu-plant-map-workspace-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const cacheable = cacheableFiles.has(url.pathname)
    || cacheablePrefixes.some(prefix => url.pathname.startsWith(prefix));
  if (!cacheable || url.pathname.startsWith('/_cqnu-local-image/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw error;
    }
  })());
});
