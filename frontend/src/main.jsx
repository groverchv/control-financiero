import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App';

// Desregistrar cualquier service worker heredado (como sw-custom.js) que cause errores en caché
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('Service Worker heredado desregistrado con éxito.');
      });
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
