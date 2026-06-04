import { useRef } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Banner global que notifica cambios de estado de red (online/offline).
 * Se muestra como una barra en la parte inferior de la pantalla.
 */
export const NetworkStatusBanner = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const bannerRef = useRef(null);

  // Usar CSS transitions para animar la aparición/desaparición
  const shouldShow = !isOnline || wasOffline;

  if (!shouldShow) return null;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold backdrop-blur-md transition-all duration-500 ${
        isOnline
          ? 'bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-900/30'
          : 'bg-slate-900/95 border-slate-700 text-white shadow-black/50'
      }`}
      style={{ animation: 'slideUpFade 0.4s ease-out' }}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 shrink-0" />
          <span>Conexión restaurada</span>
          <span className="text-emerald-200 text-xs font-normal">Sincronizando datos...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 shrink-0 text-red-400" />
          <span>Sin conexión a internet</span>
          <span className="text-slate-400 text-xs font-normal">Los datos pueden no estar actualizados</span>
        </>
      )}

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};
