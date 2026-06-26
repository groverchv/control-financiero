/**
 * Configuración centralizada de URLs de APIs externas.
 * Evita la duplicación de la lógica de detección de entorno
 * que antes existía en blockchain.js y administracion/api/index.js.
 * 
 * Pilar: Mantenibilidad (DRY — Don't Repeat Yourself)
 */

/**
 * URL base de la API Gateway del Blockchain.
 * 
 * Lógica de resolución:
 * - En producción (HTTPS o dominio público): usa el proxy inverso '/api-blockchain'
 * - En desarrollo local: usa la variable de entorno o fallback a localhost:3001
 */
export const BLOCKCHAIN_API = typeof window !== 'undefined' && 
  (window.location.protocol === 'https:' || !window.location.hostname.match(/^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)$/))
    ? '/api-blockchain'
    : (import.meta.env.VITE_BLOCKCHAIN_API_URL || 'http://localhost:3001');

/**
 * URL base de Supabase (lectura directa desde variables de entorno).
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
