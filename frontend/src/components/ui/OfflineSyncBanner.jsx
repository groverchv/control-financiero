import React, { useState, useEffect } from 'react';
import { Wifi, RefreshCw, CheckCircle } from 'lucide-react';
import { syncOfflineQueue } from '../../utils/offlineQueue';
import { administracionApi } from '../../features/administracion/api';
import { finanzasApi } from '../../features/finanzas/api';
import { patrimonioApi } from '../../features/patrimonio/api';
import { academicoApi } from '../../features/academico/api';

const QUEUE_KEY = 'control-financiero-offline-write-queue';

export const OfflineSyncBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isSyncingRef = React.useRef(false);

  const checkQueue = () => {
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      setQueueCount(queue.length);
      return queue.length;
    } catch (e) {
      console.error('[OfflineSyncBanner] Error checking queue:', e);
      setQueueCount(0);
      return 0;
    }
  };

  const handleManualSync = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await syncOfflineQueue({
        administracionApi,
        finanzasApi,
        patrimonioApi,
        academicoApi
      });
      checkQueue();
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (queue.length === 0) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (e) {
      console.error('[OfflineSyncBanner] Error al sincronizar:', e);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkQueue();

    // Auto-sync on startup if online
    const triggerInitialSync = async () => {
      try {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (navigator.onLine && queue.length > 0) {
          await handleManualSync();
        }
      } catch (err) {
        console.error('[OfflineSyncBanner] Error in triggerInitialSync:', err);
      }
    };
    triggerInitialSync();

    const interval = setInterval(() => {
      checkQueue();
      // Auto-sync periodically if online and queue has items
      try {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (navigator.onLine && queue.length > 0 && !isSyncingRef.current) {
          handleManualSync();
        }
      } catch (err) {
        console.error('[OfflineSyncBanner] Error in periodic sync:', err);
      }
    }, 2000);

    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Si está online, no hay pendientes en cola, y no estamos mostrando el mensaje de éxito, no mostrar nada
  if (isOnline && queueCount === 0 && !showSuccess && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      {showSuccess && (
        <div className="flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-emerald-500 max-w-sm transition-all duration-300">
          <CheckCircle className="h-5 w-5 shrink-0 animate-bounce" />
          <div>
            <p className="font-bold text-sm">¡Datos Sincronizados!</p>
            <p className="text-xs text-emerald-100">Las operaciones sin conexión han sido guardadas.</p>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-full shadow-lg border border-slate-700/80 max-w-[200px] backdrop-blur-sm">
          <div className="bg-amber-500 h-2 w-2 rounded-full animate-pulse shrink-0" />
          <span className="text-[10px] font-bold text-slate-300">
            {queueCount > 0 ? `${queueCount} pendiente(s)` : 'Modo local activo'}
          </span>
        </div>
      )}

      {isOnline && (queueCount > 0 || isSyncing) && (
        <div className="flex flex-col gap-2 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Conexión restablecida</p>
              <p className="text-xs text-slate-400">Sincronizando operaciones pendientes con el servidor.</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : `${queueCount} pendientes`}
            </span>
            {!isSyncing && (
              <button 
                onClick={handleManualSync}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-bold transition-all text-[11px]"
              >
                Sincronizar ahora
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
