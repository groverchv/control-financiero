// Service Worker personalizado — Control Financiero PWA
// Estrategia: Network-First para navegación HTML (rutas SPA).
// El shell de la app (index.html) siempre se precachea en el install,
// por lo que nuevos usuarios pueden usar la app inmediatamente.

// El build de Workbox (injectManifest) inyecta aquí la lista de assets del dist.
const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];

const CACHE_NAME = 'control-financiero-v4';
const OFFLINE_URL = '/offline.html';
// index.html es el shell de la SPA — siempre se precachea
const APP_SHELL   = '/index.html';

// Assets mínimos que deben estar en caché para que la app funcione sin red.
const BASE_ASSETS = [
  OFFLINE_URL,
  APP_SHELL,
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// ─── Instalación: precachear assets críticos + todo el build ──────────────────
self.addEventListener('install', (event) => {
  // Combinar base + manifest del build (contiene JS/CSS hasheados)
  const urlsToCache = [
    ...BASE_ASSETS,
    ...PRECACHE_MANIFEST.map((entry) =>
      typeof entry === 'string' ? entry : entry.url
    ),
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // allSettled: si algún asset falla (ej. icono grande), no bloquea el install
      Promise.allSettled(urlsToCache.map((url) => cache.add(url)))
    )
  );
  // Tomar control inmediatamente sin esperar que cierren las pestañas abiertas
  self.skipWaiting();
});

// ─── Activación: limpiar cachés de versiones anteriores ───────────────────────
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
  // Reclamar todas las pestañas abiertas sin recargar
  self.clients.claim();
});

// ─── Fetch: estrategia inteligente por tipo de recurso ────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar GET y URLs http/https
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── 1. Navegación de documentos HTML (rutas SPA: /inicio, /admin/kpis, etc.) ──
  // Network-First: intenta siempre la red primero para obtener la última versión.
  //   ✅ Con internet → Netlify sirve index.html → React Router carga la ruta → OK.
  //   🔌 Sin red + caché de esa ruta exacta → sirve desde caché.
  //   🔌 Sin red + sin esa ruta → sirve el APP SHELL (index.html) precacheado.
  //   🔌 Sin red + sin ningún shell → muestra /offline.html como último recurso.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Guardar en caché si la respuesta es válida (para uso offline futuro)
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, response.clone())
            );
          }
          return response;
        })
        .catch(async () => {
          // Red no disponible → 1) buscar ruta exacta, 2) app shell, 3) offline.html
          const cached = await caches.match(request);
          if (cached) return cached;

          // El app shell (index.html) sirve TODAS las rutas SPA sin red.
          // Esto funciona incluso para usuarios nuevos porque lo precachemos en install.
          const appShell = await caches.match(APP_SHELL);
          if (appShell) return appShell;

          // Último recurso: página offline estática
          const offlinePage = await caches.match(OFFLINE_URL);
          return (
            offlinePage ||
            new Response('Sin conexión a internet', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  // ── 2. APIs externas: nunca cachear ──────────────────────────────────────────
  // Supabase, Blockchain API y rutas /api/* siempre van a la red.
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname === '163.176.208.80' ||
    url.pathname.startsWith('/api/')
  ) {
    // Network-Only: si falla, que falle (la app maneja el error con toast)
    event.respondWith(fetch(request));
    return;
  }

  // ── 3. Assets estáticos con hash (JS, CSS del build de Vite) ─────────────────
  // Cache-First: Vite genera nombres con hash → son inmutables.
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
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── 4. Imágenes locales (iconos, hero, etc.) ──────────────────────────────────
  // Cache-First: raramente cambian, se cachean para carga rápida.
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
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── 5. Cloudinary (fotos de miembros) ─────────────────────────────────────────
  // Stale-While-Revalidate: sirve caché inmediatamente y actualiza en background.
  if (url.hostname.includes('cloudinary.com')) {
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

  // ── 6. Leaflet CDN y OpenStreetMap (mapas) ────────────────────────────────────
  // Stale-While-Revalidate: tiles de mapa son grandes, se sirven desde caché.
  if (
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

  // ── 7. Resto: Network-First con fallback a caché ──────────────────────────────
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
