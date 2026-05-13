import { supabase } from '../../../services/supabase';
import { cloudinaryService } from '../../../services/cloudinary';
import { brevoService } from '../../../services/brevo';

export const academicoApi = {
  obtenerTiposActividad: async () => {
    const { data, error } = await supabase
      .from('tipo_actividad')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data || [];
  },

  crearTipoActividad: async (tipo) => {
    const { data, error } = await supabase
      .from('tipo_actividad')
      .insert([tipo])
      .select();
    if (error) throw error;
    return data[0];
  },

  actualizarTipoActividad: async (id, updates) => {
    const { data, error } = await supabase
      .from('tipo_actividad')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  eliminarTipoActividad: async (id) => {
    const { error } = await supabase
      .from('tipo_actividad')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  crearActividad: async (actividad, imagenFile = null) => {
    const { data, error } = await supabase
      .from('actividad')
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
        miembro_id: actividad.miembro_id,
        tipo_actividad_id: actividad.tipo_actividad_id
      }])
      .select();

    if (error) throw error;
    const nuevaAct = data[0];

    if (imagenFile) {
      const url = await cloudinaryService.uploadFile(imagenFile, 'actividades');
      await supabase.from('archivo').insert([{
        actividad_id: nuevaAct.id,
        url,
        tipo: 'foto',
        estado: 'activo'
      }]);
    }

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
        }).catch(err => console.error('[Brevo] Error notificando nueva actividad:', err));
      }
    } catch (emailErr) {
      console.error('[Brevo] Error obteniendo socios para notificación:', emailErr);
    }

    return { ...nuevaAct, nombre: nuevaAct.titulo };
  },

  obtenerActividades: async () => {
    const { data, error } = await supabase
      .from('actividad')
      .select('*, tipo_actividad(nombre), archivo(url)')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({ 
      ...d, 
      nombre: d.titulo,
      tipo_nombre: d.tipo_actividad?.nombre || 'General',
      imagen: d.archivo?.[0]?.url || null
    }));
  },

  actualizarActividad: async (id, updates, imagenFile = null) => {
    const preparedUpdates = { ...updates };
    if (updates.nombre) preparedUpdates.titulo = updates.nombre;

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
      estado: preparedUpdates.estado,
      tipo_actividad_id: preparedUpdates.tipo_actividad_id
    };

    const { data, error } = await supabase
      .from('actividad')
      .update(finalUpdates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (imagenFile) {
      const url = await cloudinaryService.uploadFile(imagenFile, 'actividades');
      await supabase.from('archivo').delete().eq('actividad_id', id);
      await supabase.from('archivo').insert([{
        actividad_id: id,
        url,
        tipo: 'foto',
        estado: 'activo'
      }]);
    }

    return { ...data[0], nombre: data[0].titulo };
  },

  eliminarActividad: async (id) => {
    const { error } = await supabase
      .from('actividad')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
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

  obtenerActividadPorId: async (id) => {
    const { data, error } = await supabase
      .from('actividad')
      .select('*, tipo_actividad(nombre), archivo(url)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { 
      ...data, 
      nombre: data.titulo,
      tipo_nombre: data.tipo_actividad?.nombre || 'General',
      imagen: data.archivo?.[0]?.url || null
    };
  },

  obtenerInscripcionesUsuario: async (miembroId) => {
    if (!miembroId) return [];
    const { data, error } = await supabase
      .from('inscripcion')
      .select('actividad_id')
      .eq('miembro_id', miembroId);
    
    if (error) throw error;
    return data || [];
  },

  verificarInscripcion: async (miembroId, actividadId) => {
    if (!miembroId) return false;
    const { data, error } = await supabase
      .from('inscripcion')
      .select('id')
      .eq('miembro_id', miembroId)
      .eq('actividad_id', actividadId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  inscribirSocio: async (miembroId, actividadId) => {
    // Primero, verificamos si hay cupos
    const { data: itemData, error: itemError } = await supabase
      .from('actividad')
      .select('cupos')
      .eq('id', actividadId)
      .single();
      
    if (itemError) throw itemError;
    if (itemData.cupos <= 0) {
      throw new Error('No hay cupos disponibles para esta actividad.');
    }

    const { error } = await supabase
      .from('inscripcion')
      .insert([{
        miembro_id: miembroId,
        actividad_id: actividadId
      }]);

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Ya estás inscrito en esta actividad.');
      }
      throw error;
    }

    // Enviar email de confirmación (en segundo plano)
    try {
      const { data: miembro } = await supabase
        .from('miembro')
        .select('nombre, "correoElectronico"')
        .eq('id', miembroId)
        .single();

      if (miembro?.correoElectronico) {
        const { data: itemInfo } = await supabase
          .from('actividad')
          .select('titulo, fecha, hora, ubicacion, modalidad')
          .eq('id', actividadId)
          .single();

        brevoService.notificarInscripcionCurso({
          email: miembro.correoElectronico,
          nombre: miembro.nombre,
          curso: { ...itemInfo, nombre: itemInfo.titulo },
          miembroId
        }).catch(err => console.error('[Brevo] Error en email de inscripcion:', err));
      }
    } catch (emailErr) {
      console.error('[Brevo] Error enviando confirmación de inscripción:', emailErr);
    }

    return true;
  }
};
