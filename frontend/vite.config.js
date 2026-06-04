import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Incluir offline.html en el precaché
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'offline.html', 'icons.svg'],
      // Generar sw.js automáticamente (no usar el manual en /public)
      filename: 'sw.js',
      manifest: false, // Usar nuestro manifest.json propio en /public
      workbox: {
        // Estrategias de caché por tipo de recurso
        runtimeCaching: [
          // ── Assets estáticos de la app (JS, CSS) ── Cache-First (son inmutables por hash)
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-v1',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 días
            },
          },
          // ── Imágenes locales ── Cache-First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-v1',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 24 * 60 * 60 }, // 60 días
            },
          },
          // ── Cloudinary (imágenes de miembros/actividades) ── StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cloudinary-images-v1',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 días
            },
          },
          // ── Leaflet CDN (mapas) ── StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/unpkg\.com\/leaflet.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'leaflet-cdn-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          // ── Tiles de mapa de OpenStreetMap ── StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles-v1',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          // ── Supabase API ── NetworkOnly (NUNCA cachear datos en tiempo real)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          // ── Blockchain API ── NetworkOnly
          {
            urlPattern: /^http:\/\/163\.176\.208\.80.*/i,
            handler: 'NetworkOnly',
          },
        ],
        // Página de fallback cuando se navega sin conexión
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Limpiar cachés viejos automáticamente
        cleanupOutdatedCaches: true,
        // Tamaño máximo de archivos en el precaché (2MB)
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // Tomar control inmediatamente sin esperar recarga
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
