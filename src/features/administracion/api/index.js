import { supabase, supabaseAdmin } from '../../../services/supabase';
import { cloudinaryService } from '../../../services/cloudinary';
import { brevoService } from '../../../services/brevo';

export const administracionApi = {
  obtenerMiembros: async () => {
    const { data, error } = await supabase
      .from('miembro')
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, creacion');

    if (error) throw error;
    // Mapeo para compatibilidad con la UI
    return (data || []).map(m => ({
      ...m,
      email: m.correoElectronico, // Mapeamos correoElectronico a email para la UI
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

    if (authError) throw authError;

    // 2. Si se pasaron campos adicionales, actualizamos la tabla miembro
    const updates = {};
    if (miembro.telefono) updates.telefono = miembro.telefono;
    if (miembro.apellidoPaterno) updates["apellidoPaterno"] = miembro.apellidoPaterno;
    if (miembro.apellidoMaterno) updates["apellidoMaterno"] = miembro.apellidoMaterno;
    if (miembro.password) updates.contrasena = miembro.password;

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

    // Enviar email de bienvenida al nuevo socio (en segundo plano)
    const emailToNotify = data?.correoElectronico || emailToUse;
    if (emailToNotify) {
      brevoService.enviarNotificacionGeneral({
        email: emailToNotify,
        nombre: data?.nombre || miembro.nombre,
        titulo: 'Bienvenido a la Institución',
        mensaje: `Tu cuenta ha sido creada exitosamente. Ya puedes acceder al portal institucional con tu correo electrónico <strong>${emailToNotify}</strong>. Explora los eventos, cursos y mantente al día con tus obligaciones financieras.`,
        tipo: 'success'
      }).catch(err => console.error('[Brevo] Error enviando email de bienvenida:', err));
    }

    return {
      ...data,
      email: data.correoElectronico
    };
  },

  actualizarMiembro: async (id, updates) => {
    // Si la UI envía 'email', lo mapeamos a 'correoElectronico'
    const finalUpdates = { ...updates };
    if (updates.email) {
      finalUpdates.correoElectronico = updates.email;
      delete finalUpdates.email;
    }

    const { data, error } = await supabase
      .from('miembro')
      .update(finalUpdates)
      .eq('id', id)
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado');

    if (error) throw error;
    const res = data?.[0];
    return res ? { ...res, email: res.correoElectronico } : null;
  },

  eliminarMiembro: async (id) => {
    if (!supabaseAdmin) {
      throw new Error('No se ha configurado la clave de administrador (Service Role Key)');
    }
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    return true;
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
  enviarAlertaEmail: async ({ titulo, mensaje, miembroId = null, tipo = 'info' }) => {
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

    // Enviar emails en segundo plano
    const results = [];
    for (const dest of destinatarios) {
      if (dest.correoElectronico) {
        const result = await brevoService.enviarNotificacionGeneral({
          email: dest.correoElectronico,
          nombre: dest.nombre,
          titulo,
          mensaje,
          tipo
        });
        results.push(result);
      }
    }

    return { enviados: results.filter(r => r.success).length, total: destinatarios.length };
  },

  /**
   * Obtener inscripciones de un miembro (eventos + actividades)
   */
  obtenerInscripcionesMiembro: async (miembroId) => {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('*, evento(id, titulo, fecha, hora, ubicacion, modalidad, estado), actividad_academica(id, titulo, fecha, hora, ubicacion, modalidad, estado)')
      .eq('miembro_id', miembroId)
      .order('fecha_inscripcion', { ascending: false });

    if (error) throw error;
    return (data || []).map(i => ({
      ...i,
      tipo: i.evento_id ? 'evento' : 'actividad',
      nombre: i.evento?.titulo || i.actividad_academica?.titulo || 'Sin nombre',
      fecha: i.evento?.fecha || i.actividad_academica?.fecha,
      modalidad: i.evento?.modalidad || i.actividad_academica?.modalidad,
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

  /**
   * Obtener el documento (CV) de un miembro
   */
  obtenerDocumentoMiembro: async (miembroId) => {
    const { data, error } = await supabase
      .from('archivo')
      .select('url')
      .eq('miembro_id', miembroId)
      .eq('tipo', 'documento')
      .eq('estado', 'activo')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.url || null;
  },

  /**
   * Obtener todos los inscritos en un evento con datos completos
   */
  obtenerInscritosEvento: async (eventoId) => {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('creacion, miembro:miembro_id(id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado)')
      .eq('evento_id', eventoId)
      .order('creacion', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({
      ...d.miembro,
      email: d.miembro?.correoElectronico,
      fechaInscripcion: d.creacion,
    }));
  },

  /**
   * Obtener todos los inscritos en una actividad con datos completos
   */
  obtenerInscritosActividad: async (actividadId) => {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('creacion, miembro:miembro_id(id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado)')
      .eq('actividad_academica_id', actividadId)
      .order('creacion', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({
      ...d.miembro,
      email: d.miembro?.correoElectronico,
      fechaInscripcion: d.creacion,
    }));
  }
};
