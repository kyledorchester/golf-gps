const CACHE_NAME = 'golf-gps-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/manifest.json', '/icon.svg']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-first for KMZ/KML files and API routes
  if (
    event.request.url.includes('.kmz') ||
    event.request.url.includes('.kml') ||
    event.request.url.includes('/api/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) =>
          cached ?? new Response('Offline — file not cached.', { status: 503 })
        )
      )
    );
    return;
  }

  // Cache-first for app shell (JS, CSS, fonts, etc.)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        cached ?? new Response('Offline — no cached version available.', { status: 503 })
      );
    })
  );
});
