import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App';

// Desregistrar cualquier service worker heredado (como sw-custom.js) que cause errores en caché
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('Service Worker heredado desregistrado con éxito.');
        });
      }
      
      // Borrar caches almacenados por el SW antiguo para evitar cargar archivos viejos
      if (window.caches) {
        caches.keys().then((keyList) => {
          Promise.all(keyList.map((key) => caches.delete(key)));
        });
      }
      
      // Forzar una recarga única para limpiar la memoria del navegador del SW obsoleto
      if (!sessionStorage.getItem('sw_cleared')) {
        sessionStorage.setItem('sw_cleared', 'true');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  });
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

// Evitar que la rueda del mouse cambie el valor de los campos numéricos activos
document.addEventListener('wheel', (e) => {
  if (document.activeElement && document.activeElement.type === 'number') {
    e.preventDefault();
  }
}, { passive: false });

// Evitar que las teclas flecha arriba y flecha abajo incrementen/decrementen valores numéricos
document.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.type === 'number') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  }
});

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
