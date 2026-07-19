import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan las variables de entorno de Supabase. Verifica tu archivo .env.local');
}

// Cliente público: usa anon key + RLS para todo acceso desde el navegador.
// NUNCA importar service_role_key en el frontend — quedaría en el bundle JS en texto plano.
// Las operaciones administrativas (crear/eliminar usuarios) se delegan al backend Node.js.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
