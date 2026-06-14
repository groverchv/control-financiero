import { apiCache } from './apiCache';

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
    try {
      apiCache.invalidate('obtenerMiembros');
      apiCache.invalidate('finanzas');
    } catch (e) {
      console.error('Error al invalidar caché tras sincronización:', e);
    }
  } else {
    console.warn(`[Offline Sync] Quedaron ${remainingQueue.length} elementos pendientes por reintentar.`);
  }

  // Notificar a la UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-completed', { detail: { remaining: remainingQueue.length } }));
  }
};

export const withWriteQueue = (type, apiCallFnName, originalFn) => {
  return async (...args) => {
    const handleOfflineFallback = () => {
      queueOfflineAction(type, apiCallFnName, args);
      
      const firstArg = args[0] && typeof args[0] === 'object' ? args[0] : {};
      let extraData;
      
      if (type === 'miembro') {
        if (apiCallFnName === 'actualizarMiembro' && args[1] && typeof args[1] === 'object') {
          extraData = { ...args[1], id: args[0] };
        } else if (apiCallFnName === 'inactivarMiembro') {
          extraData = { id: args[0], estado: 'inactivo' };
        } else {
          extraData = { ...firstArg };
        }
        
        // Asegurar campos esperados por la UI
        if (extraData.email && !extraData.correoElectronico) {
          extraData.correoElectronico = extraData.email;
        }
        if (extraData.correoElectronico && !extraData.email) {
          extraData.email = extraData.correoElectronico;
        }
      } else {
        extraData = { ...firstArg };
      }

      // Retornamos una respuesta simulada de éxito local con datos del formulario para que la UI no se rompa
      return { 
        ...extraData,
        _offlinePending: true, 
        id: extraData.id || `offline-${Date.now()}`,
        creacion: new Date().toISOString(),
        estado: extraData.estado || 'pendiente_sincronizar'
      };
    };

    if (navigator.onLine) {
      try {
        return await originalFn(...args);
      } catch (error) {
        const errorStr = String(error).toLowerCase();
        const isNetworkError = 
          error instanceof TypeError || 
          error.name === 'TypeError' ||
          errorStr.includes('failed to fetch') ||
          errorStr.includes('network error') ||
          errorStr.includes('networkerror') ||
          errorStr.includes('load failed') ||
          errorStr.includes('failed to resolve') ||
          errorStr.includes('dns') ||
          errorStr.includes('timeout');

        if (isNetworkError) {
          console.warn(`[Offline Queue] Error de red detectado durante llamada online. Encolando offline: ${apiCallFnName}`, error);
          return handleOfflineFallback();
        }
        throw error;
      }
    } else {
      return handleOfflineFallback();
    }
  };
};

/**
 * Fusiona los registros de la cola local pendientes de sincronización con la lista de datos cargada.
 */
export const applyPendingQueueToData = (type, data) => {
  if (!Array.isArray(data)) return data;
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    let result = [...data];

    for (const action of queue) {
      if (action.type !== type) continue;
      const { apiCallFnName, args } = action;

      if (type === 'miembro') {
        if (apiCallFnName === 'crearMiembro') {
          const miembro = args[0];
          const exists = result.some(m => m.email === miembro.email || m.id === action.id);
          if (!exists) {
            result.unshift({
              ...miembro,
              id: action.id,
              creacion: new Date(action.timestamp).toISOString(),
              estado: 'pendiente_sincronizar',
              email: miembro.email || miembro.correoElectronico,
              correoElectronico: miembro.correoElectronico || miembro.email,
              _offlinePending: true
            });
          }
        } else if (apiCallFnName === 'actualizarMiembro') {
          const [id, updates] = args;
          result = result.map(m => {
            if (m.id === id) {
              return { ...m, ...updates, _offlinePending: true };
            }
            return m;
          });
        } else if (apiCallFnName === 'inactivarMiembro') {
          const [id] = args;
          result = result.map(m => {
            if (m.id === id) {
              return { ...m, estado: 'inactivo', _offlinePending: true };
            }
            return m;
          });
        }
      } else if (type === 'ingreso') {
        if (apiCallFnName === 'registrarPago') {
          const pago = args[0];
          const exists = result.some(p => p.id === action.id);
          if (!exists) {
            result.unshift({
              ...pago,
              id: action.id,
              creacion: new Date(action.timestamp).toISOString(),
              estado: 'pendiente_sincronizar',
              _offlinePending: true
            });
          }
        }
      } else if (type === 'egreso') {
        if (apiCallFnName === 'registrarEgreso') {
          const egreso = args[0];
          const exists = result.some(e => e.id === action.id);
          if (!exists) {
            result.unshift({
              ...egreso,
              id: action.id,
              creacion: new Date(action.timestamp).toISOString(),
              estado: 'pendiente_sincronizar',
              _offlinePending: true
            });
          }
        }
      } else if (type === 'actividad') {
        if (apiCallFnName === 'crearActividad') {
          const actividad = args[0];
          const exists = result.some(a => a.id === action.id);
          if (!exists) {
            result.unshift({
              ...actividad,
              id: action.id,
              titulo: actividad.nombre || actividad.titulo,
              nombre: actividad.nombre || actividad.titulo,
              creacion: new Date(action.timestamp).toISOString(),
              estado: 'pendiente_sincronizar',
              _offlinePending: true
            });
          }
        }
      } else if (type === 'inscripcion') {
        if (apiCallFnName === 'inscribirSocio') {
          const [miembroId, actividadId] = args;
          const exists = result.some(i => i.actividad_id === actividadId && i.miembro_id === miembroId);
          if (!exists) {
            result.push({
              id: action.id,
              miembro_id: miembroId,
              actividad_id: actividadId,
              estado: 'pendiente_sincronizar',
              _offlinePending: true
            });
          }
        }
      } else if (type === 'activo') {
        if (apiCallFnName === 'registrarActivo') {
          const activo = args[0];
          const exists = result.some(a => a.id === action.id);
          if (!exists) {
            result.unshift({
              ...activo,
              id: action.id,
              creacion: new Date(action.timestamp).toISOString(),
              estado: 'pendiente_sincronizar',
              _offlinePending: true
            });
          }
        }
      } else if (type === 'adquisicion') {
        if (apiCallFnName === 'registrarAdquisicion') {
          const adquisicion = args[0];
          const exists = result.some(a => a.id === action.id);
          if (!exists) {
            result.unshift({
              ...adquisicion,
              id: action.id,
              fecha: adquisicion.fecha || new Date(action.timestamp).toISOString().split('T')[0],
              estado: 'pendiente_sincronizar',
              _offlinePending: true
            });
          }
        }
      }
    }
    return result;
  } catch (e) {
    console.error('Error applying pending queue to data:', e);
    return data;
  }
};
