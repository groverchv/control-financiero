/**
 * Utilidad de Caché en Memoria para optimizar y acelerar las consultas a Supabase/API.
 * Previene llamadas de red repetitivas y redundantes dentro de una misma sesión de usuario.
 */
class ApiCache {
    constructor() {
        this.cache = new Map();
        this.defaultTtl = 15000; // 15 segundos por defecto para lecturas concurrentes rápidas
    }

    /**
     * Obtiene un valor de la caché. Retorna null si no existe o ha expirado.
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key); // Evicción proactiva
            return null;
        }

        return entry.value;
    }

    /**
     * Guarda un valor en la caché con un TTL (Time To Live) específico.
     */
    set(key, value, ttl = this.defaultTtl) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });
    }

    /**
     * Invalida entradas de caché que comiencen o contengan un patrón de texto.
     * Útil para limpiar el caché de un módulo entero al realizar escrituras.
     */
    invalidate(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Limpia por completo la caché.
     */
    clear() {
        this.cache.clear();
    }
}

export const apiCache = new ApiCache();
export default apiCache;
