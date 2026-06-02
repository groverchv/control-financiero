const CACHE_NAME = 'control-financiero-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/inicio',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones de nuestro propio origen y GET
  if (event.request.origin === self.location.origin && event.request.method === 'GET') {
    // No cachear llamadas a Supabase o Blockchain
    if (!event.request.url.includes('/api/') && !event.request.url.includes('.supabase.co')) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }).catch(() => {
            // Offline fallback si es una navegación de página html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/inicio');
            }
          });
        })
      );
    }
  }
});
