const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../services/logger');

// Inicializar cliente Supabase Admin
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('[Admin API] Faltan variables de entorno de Supabase Admin (URL o Service Role Key).');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

/**
 * Registra un nuevo miembro en Supabase Auth y actualiza sus datos en la tabla miembro.
 * Evita exponer la clave de administrador en el cliente.
 */
router.post('/miembros/crear', async (req, res) => {
  try {
    const { email, password, nombre, rol, telefono, apellidoPaterno, apellidoMaterno, contrasenaEncriptada } = req.body;
    
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: email, password, nombre' });
    }

    // 1. Crear en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: nombre,
        rol: rol || 'socio'
      }
    });

    if (authError) {
      logger.error('Error al crear usuario en Supabase Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // 2. Actualizar datos en la tabla miembro (bypasseando RLS)
    const updates = {};
    if (telefono) updates.telefono = telefono;
    if (apellidoPaterno) updates.apellidoPaterno = apellidoPaterno;
    if (apellidoMaterno) updates.apellidoMaterno = apellidoMaterno;
    if (contrasenaEncriptada) updates.contrasena = contrasenaEncriptada;

    if (Object.keys(updates).length > 0) {
      const { error: dbError } = await supabaseAdmin
        .from('miembro')
        .update(updates)
        .eq('id', authData.user.id);

      if (dbError) {
        logger.error('Error al actualizar tabla miembro en la creación:', dbError);
        return res.status(400).json({ error: dbError.message });
      }
    }

    return res.status(200).json({ user: authData.user });
  } catch (err) {
    logger.error('Error interno en /miembros/crear:', err);
    return res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

/**
 * Resetea la contraseña de un miembro en Supabase Auth y actualiza la contraseña encriptada en la BD.
 */
router.post('/miembros/actualizar-password', async (req, res) => {
  try {
    const { userId, newPassword, contrasenaEncriptada } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: userId, newPassword' });
    }

    // 1. Actualizar en Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (authError) {
      logger.error('Error al actualizar password en Supabase Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // 2. Actualizar en la tabla miembro
    if (contrasenaEncriptada) {
      const { error: dbError } = await supabaseAdmin
        .from('miembro')
        .update({ contrasena: contrasenaEncriptada })
        .eq('id', userId);

      if (dbError) {
        logger.error('Error al actualizar contraseña en tabla miembro:', dbError);
        return res.status(400).json({ error: dbError.message });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Error interno en /miembros/actualizar-password:', err);
    return res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

/**
 * Actualiza los datos de Auth (email, nombre, rol) de un miembro.
 */
router.post('/miembros/actualizar-auth', async (req, res) => {
  try {
    const { userId, updates } = req.body;

    if (!userId || !updates) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: userId, updates' });
    }

    const authUpdates = {};
    if (updates.email) {
      authUpdates.email = updates.email;
    }
    if (updates.rol || updates.nombre) {
      authUpdates.user_metadata = {};
      if (updates.nombre) authUpdates.user_metadata.full_name = updates.nombre;
      if (updates.rol) authUpdates.user_metadata.rol = updates.rol;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
      if (authError) {
        logger.error('Error al actualizar datos de Auth en Supabase:', authError);
        return res.status(400).json({ error: authError.message });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Error interno en /miembros/actualizar-auth:', err);
    return res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

module.exports = router;
