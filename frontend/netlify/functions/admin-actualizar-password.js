import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido. Use POST.' }),
    };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuración del servidor incompleta (Supabase URL/Key faltantes).' }),
    };
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan parámetros obligatorios (userId, newPassword).' }),
      };
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Contraseña actualizada correctamente.' }),
    };
  } catch (err) {
    console.error('[admin-actualizar-password] Error de servidor:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno de Netlify Function' }),
    };
  }
}
