import { useEffect } from 'react';
import { syncOfflineQueue } from '../utils/offlineQueue';
import { administracionApi } from '../features/administracion/api';
import { finanzasApi } from '../features/finanzas/api';
import { patrimonioApi } from '../features/patrimonio/api';
import { academicoApi } from '../features/academico/api';

/**
 * Hook personalizado para manejar la sincronización automática de escrituras offline
 * cuando el navegador recupere la conexión a internet.
 */
export const useOfflineSync = () => {
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[Offline Sync] Conexión a internet restaurada. Sincronizando cola de operaciones...');
      try {
        await syncOfflineQueue({
          administracionApi,
          finanzasApi,
          patrimonioApi,
          academicoApi
        });
      } catch (e) {
        console.error('[Offline Sync] Error durante la sincronización de la cola:', e);
      }
    };

    window.addEventListener('online', handleOnline);
    
    // Intenta sincronizar al iniciar la aplicación si ya está online
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
};
