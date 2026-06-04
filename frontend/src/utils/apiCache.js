/**
 * Envoltorio (HOC / Decorador de funciones) para agregar almacenamiento en caché local.
 * Si hay conexión, realiza la petición real y la guarda.
 * Si no hay conexión o la red falla, intenta recuperar el último resultado guardado en localStorage.
 * 
 * @param {string} cacheKey Identificador único para el recurso en caché
 * @param {Function} asyncFn Función asíncrona original que realiza la petición
 * @returns {Function} Función envuelta con soporte de caché offline
 */
export const withCache = (cacheKey, asyncFn) => {
  return async (...args) => {
    const key = `${cacheKey}_${JSON.stringify(args)}`;
    
    if (navigator.onLine) {
      try {
        const result = await asyncFn(...args);
        try {
          localStorage.setItem(key, JSON.stringify({ data: result, timestamp: Date.now() }));
        } catch (e) {
          console.warn('Error al guardar en localStorage (ej. cuota excedida):', e);
        }
        return result;
      } catch (error) {
        console.warn(`Error de red para ${cacheKey}, intentando recuperar de la caché local:`, error);
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            return parsed.data;
          }
        } catch (e) {
          console.error('Error al leer de localStorage:', e);
        }
        throw error;
      }
    } else {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log(`[Offline Cache] Sirviendo datos de caché para: ${cacheKey}`);
          return parsed.data;
        }
      } catch (e) {
        console.error('Error al leer de localStorage en modo offline:', e);
      }
      throw new Error("Sin conexión a internet y sin datos en la caché local.");
    }
  };
};

// Objeto apiCache para compatibilidad y uso directo en finanzasApi
export const apiCache = {
  get: (key) => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.data;
      }
    } catch (e) {
      console.error('Error al leer de apiCache:', e);
    }
    return null;
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify({ data: value, timestamp: Date.now() }));
    } catch (e) {
      console.warn('Error al guardar en apiCache:', e);
    }
  },

  invalidate: (pattern) => {
    try {
      // Si el patrón es un string simple, invalidamos todo lo que comience con él
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(pattern) || key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      }
      console.log(`[Cache Invalidated] Caché invalidada para el patrón: ${pattern}`);
    } catch (e) {
      console.error('Error al invalidar caché:', e);
    }
  }
};
