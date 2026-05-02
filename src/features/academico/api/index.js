import { supabase } from '../../../services/supabase';
import { cloudinaryService } from '../../../services/cloudinary';
import { brevoService } from '../../../services/brevo';

export const academicoApi = {
  crearEvento: async (evento, imagenFile = null) => {
    // 1. Crear el evento
    const { data, error } = await supabase
      .from('evento')
      .insert([{
        titulo: evento.nombre || evento.titulo,
        descripcion: evento.descripcion || '',
        fecha: evento.fecha,
        hora: evento.hora,
        cupos: evento.asistentes || evento.cupos || 0,
        ubicacion: evento.ubicacion || '',
        latitud: evento.latitud || null,
        longitud: evento.longitud || null,
        modalidad: evento.modalidad || 'presencial',
        costo: evento.costo || 0,
        requisitos: evento.requisitos || '',
        incluye_certificacion: evento.incluye_certificacion || false,
        miembro_id: evento.miembro_id
      }])
      .select();

    if (error) throw error;
    const nuevoEvento = data[0];

    // 2. Subir imagen si existe
    if (imagenFile) {
      const url = await cloudinaryService.uploadFile(imagenFile, 'eventos');
      await supabase.from('archivo').insert([{
        evento_id: nuevoEvento.id,
        url,
        tipo: 'foto',
        estado: 'activo'
      }]);
    }

    // 3. Notificar a todos los socios activos por email (en segundo plano)
    try {
      const { data: socios } = await supabase
        .from('miembro')
        .select('id, nombre, "correoElectronico"')
        .eq('estado', 'activo');

      if (socios?.length > 0) {
        const destinatarios = socios
          .filter(s => s.correoElectronico)
          .map(s => ({ id: s.id, email: s.correoElectronico, nombre: s.nombre }));

        brevoService.notificarNuevoEvento({
          destinatarios,
          evento: { 
            nombre: evento.nombre, 
            fecha: evento.fecha, 
            ubicacion: evento.ubicacion, 
            costo: evento.costo, 
            cupos: evento.asistentes || evento.cupos,
            descripcion: evento.descripcion 
          }
        }).catch(err => console.error('[Brevo] Error notificando nuevo evento:', err));
      }
    } catch (emailErr) {
      console.error('[Brevo] Error obteniendo socios para notificación:', emailErr);
    }

    return { ...nuevoEvento, nombre: nuevoEvento.titulo };
  },

  obtenerEventos: async () => {
    const { data, error } = await supabase
      .from('evento')
      .select('*, archivo(url)')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({ 
      ...d, 
      nombre: d.titulo,
      imagen: d.archivo?.[0]?.url || null
    }));
  },

  actualizarEvento: async (id, updates, imagenFile = null) => {
    const preparedUpdates = { ...updates };
    if (updates.nombre) preparedUpdates.titulo = updates.nombre;
    if (updates.asistentes) preparedUpdates.cupos = updates.asistentes;

    // Mapear campos si es necesario y eliminar los que no pertenecen a la tabla
    const finalUpdates = {
      titulo: preparedUpdates.titulo,
      descripcion: preparedUpdates.descripcion,
      fecha: preparedUpdates.fecha,
      hora: preparedUpdates.hora,
      cupos: preparedUpdates.cupos,
      ubicacion: preparedUpdates.ubicacion,
      latitud: preparedUpdates.latitud,
      longitud: preparedUpdates.longitud,
      modalidad: preparedUpdates.modalidad,
      costo: preparedUpdates.costo,
      requisitos: preparedUpdates.requisitos,
      incluye_certificacion: preparedUpdates.incluye_certificacion,
      estado: preparedUpdates.estado
    };

    const { data, error } = await supabase
      .from('evento')
      .update(finalUpdates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (imagenFile) {
      const url = await cloudinaryService.uploadFile(imagenFile, 'eventos');
      await supabase.from('archivo').delete().eq('evento_id', id);
      await supabase.from('archivo').insert([{
        evento_id: id,
        url,
        tipo: 'foto',
        estado: 'activo'
      }]);
    }

    return { ...data[0], nombre: data[0].titulo };
  },

  eliminarEvento: async (id) => {
    const { error } = await supabase
      .from('evento')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  crearActividad: async (actividad, imagenFile = null) => {
    const { data, error } = await supabase
      .from('actividad_academica')
      .insert([{
        titulo: actividad.nombre || actividad.titulo,
        descripcion: actividad.descripcion || '',
        fecha: actividad.fecha,
        hora: actividad.hora,
        cupos: actividad.cupos || 0,
        ubicacion: actividad.ubicacion || '',
        latitud: actividad.latitud || null,
        longitud: actividad.longitud || null,
        modalidad: actividad.modalidad || 'presencial',
        costo: actividad.costo || 0,
        requisitos: actividad.requisitos || '',
        incluye_certificacion: actividad.incluye_certificacion || false,
        miembro_id: actividad.miembro_id
      }])
      .select();

    if (error) throw error;
    const nuevaAct = data[0];

    if (imagenFile) {
      const url = await cloudinaryService.uploadFile(imagenFile, 'actividades');
      await supabase.from('archivo').insert([{
        actividad_academica_id: nuevaAct.id,
        url,
        tipo: 'foto',
        estado: 'activo'
      }]);
    }

    // 3. Notificar a todos los socios activos por email (en segundo plano)
    try {
      const { data: socios } = await supabase
        .from('miembro')
        .select('id, nombre, "correoElectronico"')
        .eq('estado', 'activo');

      if (socios?.length > 0) {
        const destinatarios = socios
          .filter(s => s.correoElectronico)
          .map(s => ({ id: s.id, email: s.correoElectronico, nombre: s.nombre }));

        brevoService.notificarNuevoCurso({
          destinatarios,
          curso: { 
            nombre: actividad.nombre, 
            fecha: actividad.fecha, 
            modalidad: actividad.modalidad,
            costo: actividad.costo, 
            cupos: actividad.cupos,
            descripcion: actividad.descripcion 
          }
        }).catch(err => console.error('[Brevo] Error notificando nuevo curso:', err));
      }
    } catch (emailErr) {
      console.error('[Brevo] Error obteniendo socios para notificación:', emailErr);
    }

    return { ...nuevaAct, nombre: nuevaAct.titulo };
  },

  obtenerActividades: async () => {
    const { data, error } = await supabase
      .from('actividad_academica')
      .select('*, archivo(url)')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({ 
      ...d, 
      nombre: d.titulo,
      imagen: d.archivo?.[0]?.url || null
    }));
  },

  actualizarActividad: async (id, updates, imagenFile = null) => {
    const preparedUpdates = { ...updates };
    if (updates.nombre) preparedUpdates.titulo = updates.nombre;
    if (updates.cupos) preparedUpdates.cupos = updates.cupos;

    const finalUpdates = {
      titulo: preparedUpdates.titulo,
      descripcion: preparedUpdates.descripcion,
      fecha: preparedUpdates.fecha,
      hora: preparedUpdates.hora,
      cupos: preparedUpdates.cupos,
      ubicacion: preparedUpdates.ubicacion,
      latitud: preparedUpdates.latitud,
      longitud: preparedUpdates.longitud,
      modalidad: preparedUpdates.modalidad,
      costo: preparedUpdates.costo,
      requisitos: preparedUpdates.requisitos,
      incluye_certificacion: preparedUpdates.incluye_certificacion,
      estado: preparedUpdates.estado
    };

    const { data, error } = await supabase
      .from('actividad_academica')
      .update(finalUpdates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (imagenFile) {
      const url = await cloudinaryService.uploadFile(imagenFile, 'actividades');
      await supabase.from('archivo').delete().eq('actividad_academica_id', id);
      await supabase.from('archivo').insert([{
        actividad_academica_id: id,
        url,
        tipo: 'foto',
        estado: 'activo'
      }]);
    }

    return { ...data[0], nombre: data[0].titulo };
  },

  eliminarActividad: async (id) => {
    const { error } = await supabase
      .from('actividad_academica')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  obtenerEventoPorId: async (id) => {
    const { data, error } = await supabase
      .from('evento')
      .select('*, archivo(url)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { 
      ...data, 
      nombre: data.titulo,
      imagen: data.archivo?.[0]?.url || null
    };
  },

  obtenerActividadPorId: async (id) => {
    const { data, error } = await supabase
      .from('actividad_academica')
      .select('*, archivo(url)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { 
      ...data, 
      nombre: data.titulo,
      imagen: data.archivo?.[0]?.url || null
    };
  },

  asignarJurado: async (asignacion) => {
    return null;
  },

  obtenerAsignaciones: async () => {
    return [];
  },

  buscarTalento: async (criterio) => {
    return [];
  },

  obtenerInscripcionesUsuario: async (miembroId) => {
    if (!miembroId) return [];
    const { data, error } = await supabase
      .from('inscripcion')
      .select('evento_id, actividad_academica_id')
      .eq('miembro_id', miembroId);
    
    if (error) throw error;
    return data || [];
  },

  verificarInscripcion: async (miembroId, academicoId, tipo) => {
    if (!miembroId) return false;
    const columna = tipo === 'evento' ? 'evento_id' : 'actividad_academica_id';
    const { data, error } = await supabase
      .from('inscripcion')
      .select('id')
      .eq('miembro_id', miembroId)
      .eq(columna, academicoId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  inscribirSocio: async (miembroId, academicoId, tipo) => {
    const columna = tipo === 'evento' ? 'evento_id' : 'actividad_academica_id';
    
    // Primero, verificamos si hay cupos
    const tabla = tipo === 'evento' ? 'evento' : 'actividad_academica';
    const { data: itemData, error: itemError } = await supabase
      .from(tabla)
      .select('cupos')
      .eq('id', academicoId)
      .single();
      
    if (itemError) throw itemError;
    if (itemData.cupos <= 0) {
      throw new Error('No hay cupos disponibles para esta actividad/evento.');
    }

    const { data, error } = await supabase
      .from('inscripcion')
      .insert([{
        miembro_id: miembroId,
        [columna]: academicoId
      }]);

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Ya estás inscrito en este evento/actividad.');
      }
      throw error;
    }

    // Enviar email de confirmación de inscripción (en segundo plano)
    try {
      const { data: miembro } = await supabase
        .from('miembro')
        .select('nombre, "correoElectronico"')
        .eq('id', miembroId)
        .single();

      if (miembro?.correoElectronico) {
        const { data: itemInfo } = await supabase
          .from(tabla)
          .select('titulo, fecha, hora, ubicacion, modalidad')
          .eq('id', academicoId)
          .single();

        const itemData = { ...itemInfo, nombre: itemInfo?.titulo };

        if (tipo === 'evento') {
          brevoService.notificarInscripcionEvento({
            email: miembro.correoElectronico,
            nombre: miembro.nombre,
            evento: itemData,
            miembroId
          }).catch(err => console.error('[Brevo] Error en email de inscripcion evento:', err));
        } else {
          brevoService.notificarInscripcionCurso({
            email: miembro.correoElectronico,
            nombre: miembro.nombre,
            curso: itemData,
            miembroId
          }).catch(err => console.error('[Brevo] Error en email de inscripcion curso:', err));
        }
      }
    } catch (emailErr) {
      console.error('[Brevo] Error enviando confirmación de inscripción:', emailErr);
    }

    return true;
  }
};
