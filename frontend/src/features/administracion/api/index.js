import { supabase } from '../../../services/supabase';
import { cloudinaryService } from '../../../services/cloudinary';
import { brevoService } from '../../../services/brevo';

// encryptPassword eliminado: la columna 'contrasena' en miembro no debe poblarse desde el frontend.
// Supabase Auth gestiona las credenciales con bcrypt. El backend usa service_role para crear usuarios.
import { withCache, apiCache } from '../../../utils/apiCache';
import { sanitizeObject } from '../../../utils/sanitize';

export const administracionApi = {
  obtenerMiembros: (() => {
    const cachedFn = withCache('obtenerMiembros', async () => {
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
          profesion,
          biografia,
          fecha_pausa,
          tiempo_restante_cuota,
          fecha_proxima_cuota,
          monto_inscripcion,
          ci,
          archivos:archivo(url, tipo, estado)
        `);

      if (error) throw error;
      // Mapeo para compatibilidad con la UI
      return (data || []).map(m => ({
        ...m,
        email: m.correoElectronico, // Mapeamos correoElectronico a email para la UI
        // Contraseña no se expone al frontend por seguridad
        foto: m.archivos?.find(a => a.tipo === 'foto' && a.estado === 'activo')?.url || null,
      }));
    });
    return async (...args) => {
      return await cachedFn(...args);
    };
  })(),

  crearMiembro: async (miembro) => {
    const emailToUse = miembro.email || miembro.correoElectronico;

    // SEC-13: Sanitizar entradas contra XSS
    const sanitized = sanitizeObject({
      email: emailToUse,
      nombre: miembro.nombre,
      rol: miembro.rol,
      telefono: miembro.telefono,
      apellidoPaterno: miembro.apellidoPaterno,
      apellidoMaterno: miembro.apellidoMaterno,
      monto_inscripcion: miembro.monto_inscripcion ?? 150,
      ci: miembro.ci
    });

    // La contraseña inicial del usuario es su CI
    const passwordToUse = miembro.ci;

    const { data: resData, error: rpcError } = await supabase.rpc('crear_usuario_admin', {
      p_email: sanitized.email,
      p_password: passwordToUse,
      p_nombre: sanitized.nombre,
      p_rol: sanitized.rol,
      p_telefono: sanitized.telefono || null,
      p_apellido_paterno: sanitized.apellidoPaterno || null,
      p_apellido_materno: sanitized.apellidoMaterno || null,
      p_monto_inscripcion: Number(sanitized.monto_inscripcion || 150),
      p_ci: sanitized.ci
    });

    if (rpcError) {
      let mensaje = rpcError.message || 'Error al crear usuario en la base de datos';
      if (mensaje.includes('already been registered') || mensaje.includes('ya está registrado')) {
        mensaje = 'Ya existe un usuario registrado con esta dirección de correo electrónico.';
      } else if (mensaje.includes('should be at least')) {
        mensaje = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (mensaje.includes('invalid')) {
        mensaje = 'La dirección de correo electrónico no es válida.';
      }
      throw new Error(mensaje);
    }

    const authUser = resData;

    // 3. Obtener el registro final
    const { data, error } = await supabase
      .from('miembro')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) throw error;



    // Enviar correo de bienvenida por Brevo
    if (data?.correoElectronico) {
      brevoService.enviarBienvenida({
        email: data.correoElectronico,
        nombre: `${data.nombre || ''} ${data.apellidoPaterno || ''}`.trim(),
        rol: data.rol,
        montoInscripcion: data.monto_inscripcion ?? miembro.monto_inscripcion ?? 150,
        ci: data.ci
      }).catch(err => console.error('[Brevo] Error enviando email de bienvenida:', err));
    }

    apiCache.invalidate('obtenerMiembros');

    return {
      ...data,
      email: data.correoElectronico,
      // Contraseña no se expone al frontend por seguridad
    };
  },

  actualizarMiembro: async (id, updates) => {
    // SEC-13: Sanitizar payload
    const sanitized = sanitizeObject(updates);

    // 1. Si hay email o rol o nombre en los updates, también actualizamos en Auth a través de la API del backend
    const authUpdates = {};
    if (sanitized.email) {
      authUpdates.email = sanitized.email;
    }
    if (sanitized.rol || sanitized.nombre) {
      authUpdates.rol = sanitized.rol;
      authUpdates.nombre = sanitized.nombre;
    }

    if (Object.keys(authUpdates).length > 0) {
      try {
        const { error: rpcError } = await supabase.rpc('actualizar_auth_admin', {
          p_user_id: id,
          p_email: authUpdates.email || null,
          p_rol: authUpdates.rol || null,
          p_nombre: authUpdates.nombre || null
        });

        if (rpcError) {
          throw new Error(rpcError.message || 'Error al actualizar Auth en la base de datos');
        }
      } catch (err) {
        console.warn('[actualizarMiembro] No se pudo sincronizar con Auth (API offline o desactualizada):', err.message);
      }
    }

    // 2. Mapear 'email' a 'correoElectronico' para la tabla miembro
    const finalUpdates = { ...sanitized };
    if (sanitized.email) {
      finalUpdates.correoElectronico = sanitized.email;
      delete finalUpdates.email;
    }

    const { data, error } = await supabase
      .from('miembro')
      .update(finalUpdates)
      .eq('id', id)
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, fecha_pausa, tiempo_restante_cuota, fecha_proxima_cuota');

    if (error) throw error;
    apiCache.invalidate('obtenerMiembros');
    const res = data?.[0];
    return res ? { ...res, email: res.correoElectronico } : null;
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

  obtenerArchivosMiembro: withCache('obtenerArchivosMiembro', async (miembroId) => {
    const { data, error } = await supabase
      .from('archivo')
      .select('*')
      .eq('miembro_id', miembroId)
      .eq('estado', 'activo')
      .order('creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  }),

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
      .select('id, estado, fecha_inscripcion, miembro:miembro_id(id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado), ingreso(id, monto, estado)')
      .eq('actividad_id', actividadId)
      .order('fecha_inscripcion', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => {
      const ingresoValido = d.ingreso && d.ingreso.find(ing => ing.estado !== 'devolucion');
      const totalPaid = ingresoValido ? Number(ingresoValido.monto || 0) : 0;
      const ingresoId = ingresoValido ? ingresoValido.id : null;
      return {
        ...d.miembro,
        inscripcionId: d.id,
        estadoInscripcion: d.estado,
        email: d.miembro?.correoElectronico,
        fechaInscripcion: d.fecha_inscripcion,
        totalPaid,
        ingresoId
      };
    });
  },

  actualizarContrasena: async (userId, newPassword) => {
    // Nota: Solo se envía newPassword en texto plano al backend sobre HTTPS.
    // El backend usa Supabase Admin SDK (service_role) para actualizar la contraseña con bcrypt.
    // NO se guarda la contraseña en la tabla miembro.contrasena desde el frontend.
    const { error: rpcError } = await supabase.rpc('actualizar_password_admin', {
      p_user_id: userId,
      p_new_password: newPassword
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Error al actualizar contraseña en la base de datos');
    }

    return true;
  }
};
