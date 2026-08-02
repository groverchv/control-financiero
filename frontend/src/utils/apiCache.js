/**
 * Envoltorio (HOC / Decorador de funciones) para agregar almacenamiento en caché local.
 * Realiza la petición real y la guarda en sessionStorage para evitar peticiones redundantes.
 * 
 * Pilar: Eficiencia — evita peticiones redundantes con TTL configurable.
 */
export const withCache = (cacheKey, asyncFn, maxAgeMs = 15 * 1000) => {
  return async (...args) => {
    const key = `${cacheKey}_${JSON.stringify(args)}`;
    
    // Verificar si existe caché válido (no expirado)
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.timestamp || 0);
        if (age < maxAgeMs) {
          return parsed.data;
        }
      }
    } catch {
      // Ignorar fallos de lectura de caché
    }

    const result = await asyncFn(...args);
    try {
      sessionStorage.setItem(key, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch (e) {
      console.warn('Error al guardar en sessionStorage:', e);
    }
    return result;
  };
};

// Objeto apiCache para compatibilidad y uso directo en los APIs de la app
export const apiCache = {
  get: (key) => {
    try {
      const cached = sessionStorage.getItem(key);
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
      sessionStorage.setItem(key, JSON.stringify({ data: value, timestamp: Date.now() }));
    } catch (e) {
      console.warn('Error al guardar en apiCache:', e);
    }
  },

  invalidate: (pattern) => {
    try {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        if (!pattern || key.startsWith(pattern) || key.includes(pattern)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error al invalidar caché:', e);
    }
  },

  clearAll: () => {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.error('Error al limpiar todo el caché:', e);
    }
  }
};

export const clearCache = (prefix = '') => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (e) {
    console.warn('Error al limpiar sessionStorage:', e);
  }
};
