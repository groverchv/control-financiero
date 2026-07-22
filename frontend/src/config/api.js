/**
 * Configuración centralizada de URLs de APIs externas.
 */

/**
 * URL base de Supabase (lectura directa desde variables de entorno).
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * URL del servidor Backend (sirve para administrar usuarios en Supabase Auth).
 */
export const BACKEND_API = import.meta.env.VITE_BACKEND_API_URL || '';
