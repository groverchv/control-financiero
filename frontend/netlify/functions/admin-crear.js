import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  // Solo permitir solicitudes POST
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
    const { email, password, nombre, rol, telefono, apellidoPaterno, apellidoMaterno, monto_inscripcion } = body;

    if (!email || !password || !nombre || !rol) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan parámetros obligatorios (email, password, nombre, rol).' }),
      };
    }

    // 1. Crear el usuario en Auth bypass RLS
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { rol, full_name: `${nombre} ${apellidoPaterno || ''} ${apellidoMaterno || ''}`.trim() }
    });

    if (authError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: authError.message }),
      };
    }

    // 2. La base de datos tiene un trigger para crear el perfil public.miembro.
    // Actualizamos los campos adicionales que no se cargaron automáticamente usando service_role para saltar RLS.
    const { error: updateError } = await supabaseAdmin
      .from('miembro')
      .update({
        telefono: telefono || null,
        "apellidoPaterno": apellidoPaterno || null,
        "apellidoMaterno": apellidoMaterno || null,
        monto_inscripcion: monto_inscripcion || 150
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('[admin-crear] Error actualizando perfil de miembro:', updateError);
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ user: authData.user }),
    };
  } catch (err) {
    console.error('[admin-crear] Error de servidor:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno de Netlify Function' }),
    };
  }
}
