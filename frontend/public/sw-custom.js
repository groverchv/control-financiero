// Service Worker personalizado — Control Financiero PWA
// Estrategia: Network-First con fallback inmediato a index.html.
// EVITA totalmente cualquier redirección a páginas offline externas.

const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];
const CACHE_NAME = 'control-financiero-v1';
const APP_SHELL = '/index.html';

const BASE_ASSETS = [
  APP_SHELL,
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  const urlsToCache = [
    ...BASE_ASSETS,
    ...PRECACHE_MANIFEST.map((entry) =>
      typeof entry === 'string' ? entry : entry.url
    ),
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(urlsToCache.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── Navegaciones HTML (rutas de la SPA) ──
  // Siempre intentamos la red. Si falla o no hay internet, devolvemos el shell index.html.
  // NUNCA devolvemos offline.html ni hacemos redirección externa.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, response.clone())
            );
          }
          return response;
        })
        .catch(async () => {
          // Intentamos la ruta exacta desde caché
          const cached = await caches.match(request);
          if (cached) return cached;

          // Si no está, devolvemos el index.html de inmediato. La app cargará normal.
          const appShell = await caches.match(APP_SHELL);
          if (appShell) return appShell;

          // Si el shell falla (no debería), devolvemos texto simple
          return new Response('Aplicación cargando localmente...', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // APIs externas
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname === '163.176.208.80' ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // JS/CSS estáticos
  if (
    url.origin === self.location.origin &&
    /\.(js|css)(\?.*)?$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // Imágenes locales
  if (
    url.origin === self.location.origin &&
    /\.(png|jpg|jpeg|svg|gif|webp|ico)(\?.*)?$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // CDNs y mapas
  if (
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('unpkg.com') ||
    /[a-z]\.tile\.openstreetmap\.org/.test(url.hostname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
