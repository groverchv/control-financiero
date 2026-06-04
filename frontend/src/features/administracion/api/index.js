import { supabase, supabaseAdmin } from '../../../services/supabase';
import { cloudinaryService } from '../../../services/cloudinary';
import { brevoService } from '../../../services/brevo';

import { encryptPassword, decryptPassword } from '../../../utils/encryption';

export const administracionApi = {
  obtenerMiembros: async () => {
    const { data, error } = await supabase
      .from('miembro')
      .select(`
        id, 
        nombre, 
        "apellidoPaterno", 
        "apellidoMaterno", 
        "correoElectronico", 
        telefono, 
        rol, 
        estado, 
        creacion,
        contrasena,
        profesion,
        biografia,
        fecha_pausa,
        tiempo_restante_cuota,
        fecha_proxima_cuota,
        archivos:archivo(url, tipo, estado)
      `);

    if (error) throw error;
    // Mapeo para compatibilidad con la UI
    return (data || []).map(m => ({
      ...m,
      email: m.correoElectronico, // Mapeamos correoElectronico a email para la UI
      contrasena: m.contrasena ? decryptPassword(m.contrasena) : '',
      foto: m.archivos?.find(a => a.tipo === 'foto' && a.estado === 'activo')?.url || null,
    }));
  },

  crearMiembro: async (miembro) => {
    if (!supabaseAdmin) {
      throw new Error('No se ha configurado la clave de administrador (Service Role Key)');
    }

    const emailToUse = miembro.email || miembro.correoElectronico;

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailToUse,
      password: miembro.password || 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: miembro.nombre,
        rol: miembro.rol
      }
    });

    if (authError) {
      let mensaje = authError.message;
      if (mensaje.includes('already been registered')) {
        mensaje = 'Ya existe un usuario registrado con esta dirección de correo electrónico.';
      } else if (mensaje.includes('should be at least')) {
        mensaje = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (mensaje.includes('invalid')) {
        mensaje = 'La dirección de correo electrónico no es válida.';
      }
      throw new Error(mensaje);
    }

    // 2. Si se pasaron campos adicionales, actualizamos la tabla miembro
    const updates = {};
    if (miembro.telefono) updates.telefono = miembro.telefono;
    if (miembro.apellidoPaterno) updates["apellidoPaterno"] = miembro.apellidoPaterno;
    if (miembro.apellidoMaterno) updates["apellidoMaterno"] = miembro.apellidoMaterno;
    if (miembro.password) updates.contrasena = encryptPassword(miembro.password);

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('miembro')
        .update(updates)
        .eq('id', authData.user.id);
    }

    // 3. Obtener el registro final
    const { data, error } = await supabase
      .from('miembro')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (error) throw error;

    // Guardar notificación de bienvenida en el sistema interno
    try {
      await supabase.from('notificacion').insert([{
        miembro_id: data?.id,
        titulo: '¡Bienvenido!',
        descripcion: 'Tu cuenta ha sido creada. ¡Te damos una cordial bienvenida a la institución!',
        estado: 'pendiente'
      }]);
    } catch (err) {
      console.error('[Notif] Error guardando notificación de bienvenida:', err);
    }

    // Enviar correo de bienvenida por Brevo
    if (data?.correoElectronico) {
      brevoService.enviarBienvenida({
        email: data.correoElectronico,
        nombre: `${data.nombre || ''} ${data.apellidoPaterno || ''}`.trim(),
        rol: data.rol
      }).catch(err => console.error('[Brevo] Error enviando email de bienvenida:', err));
    }

    return {
      ...data,
      email: data.correoElectronico,
      contrasena: data.contrasena ? decryptPassword(data.contrasena) : ''
    };
  },

  actualizarMiembro: async (id, updates) => {
    if (!supabaseAdmin) {
      throw new Error('No se ha configurado la clave de administrador (Service Role Key)');
    }

    // 1. Si hay email o rol o nombre en los updates, también actualizamos en Auth
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
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
      if (authError) throw authError;
    }

    // 2. Mapear 'email' a 'correoElectronico' para la tabla miembro
    const finalUpdates = { ...updates };
    if (updates.email) {
      finalUpdates.correoElectronico = updates.email;
      delete finalUpdates.email;
    }

    const { data, error } = await supabase
      .from('miembro')
      .update(finalUpdates)
      .eq('id', id)
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, contrasena, fecha_pausa, tiempo_restante_cuota, fecha_proxima_cuota');

    if (error) throw error;
    const res = data?.[0];
    return res ? { ...res, email: res.correoElectronico, contrasena: res.contrasena ? decryptPassword(res.contrasena) : '' } : null;
  },

  eliminarMiembro: async () => {
    throw new Error('La eliminación directa de miembros está deshabilitada por motivos de integridad histórica de datos financieros. Utilice el cambio de estado a Inactivo en su lugar.');
  },

  inactivarMiembro: async (id) => {
    return administracionApi.actualizarMiembro(id, { estado: 'inactivo' });
  },

  obtenerAlertas: async () => {
    const { data, error } = await supabase
      .from('notificacion')
      .select('*')
      .order('creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  obtenerKpis: async () => {
    const { data, error } = await supabase.from('miembro').select('estado');
    if (error) throw error;
    
    const miembros = data || [];
    const totalMiembros = miembros.length;
    const miembrosActivos = miembros.filter(m => m.estado === 'activo').length;
    const miembrosInactivos = totalMiembros - miembrosActivos;
    const tasaRetention = totalMiembros ? Math.round((miembrosActivos / totalMiembros) * 100) : 0;
    
    return {
      totalMiembros,
      miembrosActivos,
      miembrosInactivos,
      tasaRetention
    };
  },

  actualizarPerfil: async (id, updates) => {
    // Mapeo inverso si es necesario para columnas especiales
    const finalUpdates = { ...updates };
    
    const { data, error } = await supabase
      .from('miembro')
      .update(finalUpdates)
      .eq('id', id)
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", telefono, rol, estado')
      .single();

    if (error) throw error;
    return data;
  },

  subirArchivo: async (miembroId, file, tipo = 'foto') => {
    // 1. Subir a Cloudinary
    const isImage = file.type.startsWith('image/');
    const publicUrl = isImage 
      ? await cloudinaryService.uploadFile(file, `miembros/${miembroId}`)
      : await cloudinaryService.uploadDocument(file, `miembros/${miembroId}`);

    // 2. Verificar si ya existe un archivo de este tipo para este miembro
    const { data: existente } = await supabase
      .from('archivo')
      .select('id')
      .eq('miembro_id', miembroId)
      .eq('tipo', tipo)
      .eq('estado', 'activo')
      .maybeSingle();

    let result;
    if (existente) {
      // 3. ACTUALIZAR existente
      const { data, error: dbError } = await supabase
        .from('archivo')
        .update({
          url: publicUrl,
          actualizacion: new Date().toISOString()
        })
        .eq('id', existente.id)
        .select()
        .single();
      
      if (dbError) throw dbError;
      result = data;
    } else {
      // 4. INSERTAR nuevo
      const { data, error: dbError } = await supabase
        .from('archivo')
        .insert([{
          miembro_id: miembroId,
          url: publicUrl,
          tipo: tipo,
          estado: 'activo'
        }])
        .select()
        .single();

      if (dbError) throw dbError;
      result = data;
    }

    return result;
  },

  obtenerArchivosMiembro: async (miembroId) => {
    const { data, error } = await supabase
      .from('archivo')
      .select('*')
      .eq('miembro_id', miembroId)
      .eq('estado', 'activo')
      .order('creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Enviar una notificación/alerta por email a uno o todos los socios activos.
   * También guarda la notificación en la base de datos.
   * @param {Object} params
   * @param {string} params.titulo - Título de la notificación
   * @param {string} params.mensaje - Contenido del mensaje
   * @param {string} [params.miembroId] - ID del miembro específico (si es null, se envía a todos)
   * @param {'info'|'success'|'warning'|'error'} [params.tipo] - Tipo de notificación
   */
  enviarAlertaEmail: async ({ titulo, mensaje, miembroId = null }) => {
    let destinatarios = [];

    if (miembroId) {
      // Enviar a un socio específico
      const { data: miembro } = await supabase
        .from('miembro')
        .select('id, nombre, "correoElectronico"')
        .eq('id', miembroId)
        .single();

      if (miembro) destinatarios = [miembro];
    } else {
      // Enviar a todos los socios activos
      const { data: socios } = await supabase
        .from('miembro')
        .select('id, nombre, "correoElectronico"')
        .eq('estado', 'activo');

      destinatarios = socios || [];
    }

    // Guardar notificación en BD para cada destinatario
    const notificaciones = destinatarios.map(d => ({
      miembro_id: d.id,
      titulo,
      descripcion: mensaje,
      estado: 'pendiente'
    }));

    if (notificaciones.length > 0) {
      await supabase.from('notificacion').insert(notificaciones);
    }

    // Las notificaciones ya fueron insertadas en la BD arriba
    return { enviados: 0, total: destinatarios.length };
  },

  /**
   * Obtener inscripciones de un miembro (eventos + actividades)
   */
  obtenerInscripcionesMiembro: async (miembroId) => {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('*, actividad(id, titulo, fecha, hora, ubicacion, modalidad, estado)')
      .eq('miembro_id', miembroId)
      .order('fecha_inscripcion', { ascending: false });

    if (error) throw error;
    return (data || []).map(i => ({
      ...i,
      tipo: 'actividad',
      nombre: i.actividad?.titulo || 'Sin nombre',
      fecha: i.actividad?.fecha,
      modalidad: i.actividad?.modalidad,
    }));
  },

  /**
   * Obtener notificaciones de un miembro
   */
  obtenerNotificacionesMiembro: async (miembroId) => {
    const { data, error } = await supabase
      .from('notificacion')
      .select('*')
      .eq('miembro_id', miembroId)
      .order('creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  crearNotificacion: async (miembroId, titulo, descripcion) => {
    const { data, error } = await supabase
      .from('notificacion')
      .insert({
        miembro_id: miembroId,
        titulo,
        descripcion,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Obtener el documento (CV) de un miembro
   */
  obtenerDocumentoMiembro: async (miembroId) => {
    const { data, error } = await supabase
      .from('archivo')
      .select('url')
      .eq('miembro_id', miembroId)
      .in('tipo', ['documento', 'cv'])
      .eq('estado', 'activo')
      .order('creacion', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.url || null;
  },

  obtenerInscritosActividad: async (actividadId) => {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('fecha_inscripcion, miembro:miembro_id(id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado)')
      .eq('actividad_id', actividadId)
      .order('fecha_inscripcion', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({
      ...d.miembro,
      email: d.miembro?.correoElectronico,
      fechaInscripcion: d.fecha_inscripcion,
    }));
  },

  actualizarContrasena: async (userId, newPassword) => {
    if (!supabaseAdmin) {
      throw new Error('No se ha configurado la clave de administrador (Service Role Key)');
    }

    // 1. Actualizar en Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    if (authError) throw authError;

    // 2. Actualizar en la tabla miembro
    const encrypted = encryptPassword(newPassword);
    const { error: dbError } = await supabaseAdmin
      .from('miembro')
      .update({ contrasena: encrypted })
      .eq('id', userId);

    if (dbError) throw dbError;
    return true;
  }
};
