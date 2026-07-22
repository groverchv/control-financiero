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
    const { userId, updates } = body;

    if (!userId || !updates) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan parámetros obligatorios (userId, updates).' }),
      };
    }

    const authPayload = {};
    if (updates.email) {
      authPayload.email = updates.email;
    }
    
    // Si actualizamos rol o nombre, actualizamos los metadatos del usuario
    if (updates.rol || updates.nombre) {
      authPayload.user_metadata = {};
      if (updates.rol) authPayload.user_metadata.rol = updates.rol;
      if (updates.nombre) authPayload.user_metadata.full_name = updates.nombre;
    }

    if (Object.keys(authPayload).length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No hay actualizaciones de Auth necesarias.' }),
      };
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, authPayload);

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, user: data.user }),
    };
  } catch (err) {
    console.error('[admin-actualizar-auth] Error de servidor:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno de Netlify Function' }),
    };
  }
}
