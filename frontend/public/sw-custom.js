// Service Worker personalizado — Control Financiero PWA
// Estrategia: Network-First con fallback inmediato a index.html.
// EVITA totalmente cualquier redirección a páginas offline externas.

const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];
const CACHE_NAME = 'control-financiero-v2';
const APP_SHELL = '/index.html';

const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Sin conexión — APF</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}
    .card{background:#1e293b;border:1px solid #334155;border-radius:24px;padding:48px 32px;max-width:400px;width:100%}
    .icon{font-size:48px;margin-bottom:16px}
    h1{font-size:20px;font-weight:700;margin-bottom:8px;color:#f1f5f9}
    p{font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:24px}
    button{background:#10b981;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:background .2s}
    button:hover{background:#059669}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Sin conexión a internet</h1>
    <p>No se pudo cargar la aplicación. Verifica tu conexión y vuelve a intentarlo.</p>
    <button onclick="location.reload()">Reintentar</button>
  </div>
</body>
</html>`;

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

          // Si el shell falla, devolvemos una página offline estilizada
          return new Response(OFFLINE_FALLBACK_HTML, {
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
