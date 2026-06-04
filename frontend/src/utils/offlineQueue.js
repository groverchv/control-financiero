const QUEUE_KEY = 'control-financiero-offline-write-queue';

/**
 * Agrega una acción de escritura a la cola local en localStorage.
 * 
 * @param {string} type Tipo de acción ('ingreso', 'egreso', 'miembro', etc.)
 * @param {Function} apiCallFn Función asíncrona que realiza el llamado real
 * @param {Array} args Argumentos de la función
 */
export const queueOfflineAction = (type, apiCallFnName, args) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      apiCallFnName,
      args,
      timestamp: Date.now()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    
    // Alerta visual de que se guardó localmente
    console.log(`[Offline Queue] Acción guardada localmente (${type}):`, apiCallFnName);
  } catch (e) {
    console.error('Error al guardar acción offline:', e);
  }
};

/**
 * Procesa todas las acciones en cola. Se ejecuta cuando vuelve la conexión.
 */
export const syncOfflineQueue = async (apis) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

  console.log(`[Offline Sync] Iniciando sincronización de ${queue.length} acciones pendientes...`);
  
  const remainingQueue = [];
  
  for (const action of queue) {
    const { apiCallFnName, args } = action;
    // Localizar la API correspondiente (ej. 'administracionApi', 'finanzasApi')
    let resolvedApi = null;
    
    if (apis.administracionApi && apis.administracionApi[apiCallFnName]) {
      resolvedApi = apis.administracionApi;
    } else if (apis.finanzasApi && apis.finanzasApi[apiCallFnName]) {
      resolvedApi = apis.finanzasApi;
    } else if (apis.patrimonioApi && apis.patrimonioApi[apiCallFnName]) {
      resolvedApi = apis.patrimonioApi;
    } else if (apis.academicoApi && apis.academicoApi[apiCallFnName]) {
      resolvedApi = apis.academicoApi;
    }

    if (resolvedApi) {
      try {
        console.log(`[Offline Sync] Ejecutando: ${apiCallFnName}`);
        await resolvedApi[apiCallFnName](...args);
        console.log(`[Offline Sync] Sincronización exitosa para: ${apiCallFnName}`);
      } catch (err) {
        console.error(`[Offline Sync] Error al sincronizar ${apiCallFnName}:`, err);
        // Si el error no es de conexión, lo descartamos o lo dejamos para después
        remainingQueue.push(action);
      }
    } else {
      console.warn(`[Offline Sync] No se encontró la función de API: ${apiCallFnName}`);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
  
  if (remainingQueue.length === 0) {
    console.log('[Offline Sync] Sincronización de cola completada con éxito.');
  } else {
    console.warn(`[Offline Sync] Quedaron ${remainingQueue.length} elementos pendientes por reintentar.`);
  }
};

/**
 * Envoltura para funciones de escritura de la API.
 * Si está online, ejecuta la llamada de inmediato.
 * Si está offline, la añade a la cola y retorna un objeto de éxito preliminar local.
 */
export const withWriteQueue = (type, apiCallFnName, originalFn) => {
  return async (...args) => {
    if (navigator.onLine) {
      return await originalFn(...args);
    } else {
      queueOfflineAction(type, apiCallFnName, args);
      // Retornamos una respuesta simulada de éxito local para que la UI no se rompa
      return { 
        _offlinePending: true, 
        id: `offline-${Date.now()}`,
        creacion: new Date().toISOString(),
        estado: 'pendiente_sincronizar'
      };
    }
  };
};
