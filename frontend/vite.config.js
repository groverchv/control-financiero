import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      // Reload trigger comment to refresh env config
      VitePWA({
        // Usar SW personalizado en lugar de generar uno con Workbox
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw-custom.js',
        // El archivo generado en dist se llamará sw.js
        injectRegister: 'auto',
        registerType: 'autoUpdate',
        manifest: false, // Usar nuestro manifest.json propio en /public
        injectManifest: {
          // Archivos a incluir en el precaché (se inyectan en sw-custom.js en el build)
          // En desarrollo, el SW usa la lista de ASSETS_TO_PRECACHE que está en el propio archivo.
          globPatterns: ['**/*.{js,css,html,ico,svg,png,webp}'],
          globIgnores: ['**/node_modules/**/*', 'sw-custom.js'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: {
          enabled: false, // No activar SW en desarrollo para evitar problemas de caché
        },
      }),
    ],
    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        '/api-blockchain': {
          target: env.VITE_BLOCKCHAIN_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-blockchain/, ''),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
