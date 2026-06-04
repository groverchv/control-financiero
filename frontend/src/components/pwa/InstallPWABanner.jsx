import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'pwa-install-dismissed';

/**
 * Banner premium de instalación PWA.
 * Intercepta el evento beforeinstallprompt del navegador y muestra
 * un prompt personalizado en vez del genérico del navegador.
 */
export const InstallPWABanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // No mostrar si ya está instalado como PWA standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // No mostrar si el usuario ya lo descartó previamente
    if (localStorage.getItem(STORAGE_KEY)) return;

    const handler = (e) => {
      e.preventDefault(); // Evitar el prompt nativo del navegador
      setDeferredPrompt(e);
      // Esperar 3 segundos antes de mostrar para no interrumpir la carga
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!show || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar aplicación"
      className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[9998]"
      style={{ animation: 'slideUpFade 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-emerald-600/5 pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 relative">
          {/* Ícono de la app */}
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <Smartphone className="h-7 w-7 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-sm">Instalar Control Financiero</p>
            <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
              Accede más rápido, sin navegador y funciona offline.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-900/40 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Instalar app
              </button>
              <button
                onClick={handleDismiss}
                className="text-slate-500 hover:text-slate-300 text-xs font-medium px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
