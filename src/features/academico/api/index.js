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
    const parsedCosto = (actividad.costo === '' || actividad.costo === null || actividad.costo === undefined) ? 0 : Number(actividad.costo);
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
        costo: parsedCosto,
        requisitos: actividad.requisitos || '',
        incluye_certificacion: actividad.incluye_certificacion || false,
        publicado: actividad.publicado ?? true,
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
      let tipoNombre = 'General';
      if (actividad.tipo_actividad_id) {
        const { data: tipoInfo } = await supabase
          .from('tipo_actividad')
          .select('nombre')
          .eq('id', actividad.tipo_actividad_id)
          .maybeSingle();
        if (tipoInfo?.nombre) tipoNombre = tipoInfo.nombre;
      }

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
            nombre: actividad.nombre || actividad.titulo, 
            fecha: actividad.fecha, 
            hora: actividad.hora,
            modalidad: actividad.modalidad,
            costo: actividad.costo, 
            cupos: actividad.cupos,
            descripcion: actividad.descripcion,
            tipo_nombre: tipoNombre
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

    // Fetch existing details for change detection comparison
    const { data: currentAct } = await supabase
      .from('actividad')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (currentAct) {
      const courseStart = new Date(`${currentAct.fecha}T${currentAct.hora}`);
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      const courseEndEnrollment = new Date(courseStart.getTime() + oneHour);
      if (now > courseEndEnrollment) {
        throw new Error('No se puede modificar una actividad que ya ha finalizado.');
      }
    }

    const parsedCosto = (preparedUpdates.costo === '' || preparedUpdates.costo === null || preparedUpdates.costo === undefined) ? 0 : Number(preparedUpdates.costo);

    const finalUpdates = {
      titulo: preparedUpdates.titulo,
      descripcion: preparedUpdates.descripcion,
      fecha: preparedUpdates.fecha,
      hora: preparedUpdates.hora,
      cupos: preparedUpdates.cupos,
      ubicacion: preparedUpdates.ubicacion,
      latitud: preparedUpdates.latitud || null,
      longitud: preparedUpdates.longitud || null,
      modalidad: preparedUpdates.modalidad,
      costo: parsedCosto,
      requisitos: preparedUpdates.requisitos,
      incluye_certificacion: preparedUpdates.incluye_certificacion,
      publicado: preparedUpdates.publicado,
      estado: preparedUpdates.estado,
      tipo_actividad_id: preparedUpdates.tipo_actividad_id
    };

    // Remove undefined keys to avoid sending bad data to Supabase
    Object.keys(finalUpdates).forEach(key => {
      if (finalUpdates[key] === undefined) delete finalUpdates[key];
    });

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

    // Send change-detection notifications if the activity has enrolled members
    if (currentAct) {
      const changesList = [];
      const changesSimple = [];
      let shouldUnenroll = false;

      if (finalUpdates.titulo !== undefined && finalUpdates.titulo !== currentAct.titulo) {
        changesList.push(`<li>El título de la actividad cambió de "<strong>${currentAct.titulo}</strong>" a "<strong>${finalUpdates.titulo}</strong>".</li>`);
        changesSimple.push(`Título ("${currentAct.titulo}" -> "${finalUpdates.titulo}")`);
        shouldUnenroll = true;
      }
      if (finalUpdates.descripcion !== undefined && finalUpdates.descripcion !== currentAct.descripcion) {
        changesList.push(`<li>La descripción de la actividad fue actualizada.</li>`);
        changesSimple.push(`Descripción actualizada`);
        shouldUnenroll = true;
      }
      if (finalUpdates.requisitos !== undefined && finalUpdates.requisitos !== currentAct.requisitos) {
        changesList.push(`<li>Los requisitos de la actividad fueron actualizados.</li>`);
        changesSimple.push(`Requisitos actualizados`);
        shouldUnenroll = true;
      }
      if (finalUpdates.fecha !== undefined && finalUpdates.fecha !== currentAct.fecha) {
        const oldFecha = new Date(currentAct.fecha + 'T00:00:00').toLocaleDateString('es-ES');
        const newFecha = new Date(finalUpdates.fecha + 'T00:00:00').toLocaleDateString('es-ES');
        changesList.push(`<li>La fecha cambió de <strong>${oldFecha}</strong> a <strong>${newFecha}</strong>.</li>`);
        changesSimple.push(`Fecha (${oldFecha} -> ${newFecha})`);
        shouldUnenroll = true;
      }
      if (finalUpdates.hora !== undefined && finalUpdates.hora !== currentAct.hora) {
        changesList.push(`<li>La hora de inicio cambió de <strong>${currentAct.hora ? currentAct.hora.substring(0, 5) : '--:--'} Hrs</strong> a <strong>${finalUpdates.hora ? finalUpdates.hora.substring(0, 5) : '--:--'} Hrs</strong>.</li>`);
        changesSimple.push(`Hora (${currentAct.hora ? currentAct.hora.substring(0, 5) : '--:--'} -> ${finalUpdates.hora ? finalUpdates.hora.substring(0, 5) : '--:--'})`);
        shouldUnenroll = true;
      }
      if (finalUpdates.ubicacion !== undefined && finalUpdates.ubicacion !== currentAct.ubicacion) {
        changesList.push(`<li>La ubicación cambió de "<strong>${currentAct.ubicacion || 'Sin especificar'}</strong>" a "<strong>${finalUpdates.ubicacion || 'Sin especificar'}</strong>".</li>`);
        changesSimple.push(`Ubicación ("${currentAct.ubicacion || 'Sin especificar'}" -> "${finalUpdates.ubicacion || 'Sin especificar'}")`);
        shouldUnenroll = true;
      }
      if (finalUpdates.modalidad !== undefined && finalUpdates.modalidad !== currentAct.modalidad) {
        changesList.push(`<li>La modalidad cambió de <strong style="text-transform:capitalize;">${currentAct.modalidad}</strong> a <strong style="text-transform:capitalize;">${finalUpdates.modalidad}</strong>.</li>`);
        changesSimple.push(`Modalidad (${currentAct.modalidad} -> ${finalUpdates.modalidad})`);
        shouldUnenroll = true;
      }
      if (finalUpdates.costo !== undefined && Number(finalUpdates.costo) !== Number(currentAct.costo)) {
        changesList.push(`<li>El costo de inscripción cambió de <strong>Bs. ${currentAct.costo}</strong> a <strong>Bs. ${finalUpdates.costo}</strong>.</li>`);
        changesSimple.push(`Costo (Bs. ${currentAct.costo} -> Bs. ${finalUpdates.costo})`);
        shouldUnenroll = true;
      }
      if (finalUpdates.cupos !== undefined && Number(finalUpdates.cupos) !== Number(currentAct.cupos)) {
        changesList.push(`<li>La cantidad de cupos cambió de <strong>${currentAct.cupos}</strong> a <strong>${finalUpdates.cupos}</strong>.</li>`);
        changesSimple.push(`Cupos (${currentAct.cupos} -> ${finalUpdates.cupos})`);
        // NOT setting shouldUnenroll = true for cupos change
      }

      if (changesList.length > 0) {
        // Fetch enrolled users
        const { data: inscritos, error: insErr } = await supabase
          .from('inscripcion')
          .select('miembro_id, miembro:miembro_id(id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado)')
          .eq('actividad_id', id);

        if (!insErr && inscritos && inscritos.length > 0) {
          const destinatarios = inscritos
            .filter(ins => ins.miembro && ins.miembro.estado !== 'inactivo' && ins.miembro.correoElectronico)
            .map(ins => ({
              id: ins.miembro.id,
              email: ins.miembro.correoElectronico,
              nombre: `${ins.miembro.nombre} ${ins.miembro.apellidoPaterno || ''}`.trim()
            }));

          if (destinatarios.length > 0) {
            const newDateVal = finalUpdates.fecha || currentAct.fecha;
            const fechaFormateada = new Date(newDateVal && typeof newDateVal === 'string' && newDateVal.includes('-') ? newDateVal.split('T')[0] + 'T00:00:00' : newDateVal).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            if (shouldUnenroll) {
              changesList.push(`<li><b>Importante:</b> Debido a estos cambios se ha anulado su registro. Si sigue de acuerdo con la actividad, por favor vuelva a inscribirse.</li>`);
            }

            brevoService.notificarCambioActividad({
              destinatarios,
              curso: {
                nombre: finalUpdates.titulo || currentAct.titulo,
                fecha: fechaFormateada,
                hora: finalUpdates.hora || currentAct.hora,
                ubicacion: finalUpdates.ubicacion || currentAct.ubicacion,
                modalidad: finalUpdates.modalidad || currentAct.modalidad,
                costo: finalUpdates.costo !== undefined ? finalUpdates.costo : currentAct.costo,
                cambiosSimple: changesSimple.join(', '),
                detalles: `<ul style="margin:0;padding-left:20px;line-height:1.6;font-size:14px;color:#475569;">${changesList.join('')}</ul>`,
                unenrollment: shouldUnenroll
              }
            }).catch(err => console.error('[Brevo] Error al enviar notificaciones de cambio de actividad:', err));

            if (shouldUnenroll) {
              // Delete enrollments and related active debt due to changes
              const membersIds = inscritos.map(ins => ins.miembro_id);
              if (membersIds.length > 0) {
                // Delete active debts associated with this activity 
                const activoNombrePrefix = `Inscripción Curso: ${currentAct.titulo}`;
                await supabase
                  .from('activos')
                  .delete()
                  .in('miembro_id', membersIds)
                  .like('nombre', `${activoNombrePrefix}%`);

                // Delete the enrollments
                await supabase
                  .from('inscripcion')
                  .delete()
                  .in('miembro_id', membersIds)
                  .eq('actividad_id', id);

                // Update cupos in activity
                await supabase
                  .from('actividad')
                  .update({ cupos: currentAct.cupos + inscritos.length })
                  .eq('id', id);
              }
            }
          }
        }
      }
    }

    return { ...data[0], nombre: data[0].titulo };
  },

  togglePublicado: async (id, publicado) => {
    const { data: currentAct } = await supabase
      .from('actividad')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (currentAct) {
      const courseStart = new Date(`${currentAct.fecha}T${currentAct.hora}`);
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      const courseEndEnrollment = new Date(courseStart.getTime() + oneHour);
      if (now > courseEndEnrollment) {
        throw new Error('No se puede modificar la visibilidad de una actividad que ya ha finalizado.');
      }
    }

    const { data, error } = await supabase
      .from('actividad')
      .update({ publicado })
      .eq('id', id)
      .select();
    if (error) throw error;
    return { ...data[0], nombre: data[0].titulo };
  },

  verificarTipoActividadEnUso: async (tipoId) => {
    const { count, error } = await supabase
      .from('actividad')
      .select('id', { count: 'exact', head: true })
      .eq('tipo_actividad_id', tipoId);
    if (error) throw error;
    return count > 0;
  },

  eliminarActividad: async (id) => {
    const { data: currentAct } = await supabase
      .from('actividad')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (currentAct) {
      const courseStart = new Date(`${currentAct.fecha}T${currentAct.hora}`);
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      const courseEndEnrollment = new Date(courseStart.getTime() + oneHour);
      if (now > courseEndEnrollment) {
        throw new Error('No se puede eliminar una actividad que ya ha finalizado.');
      }

      // Eliminar las deudas de inscripción pendientes de dicho curso antes de borrar
      const { data: inscritos } = await supabase
        .from('inscripcion')
        .select('miembro_id')
        .eq('actividad_id', id);

      if (inscritos && inscritos.length > 0) {
        const membersIds = inscritos.map(ins => ins.miembro_id);
        const activoNombrePrefix = `Inscripción Curso: ${currentAct.titulo}`;
        
        await supabase
          .from('activos')
          .delete()
          .in('miembro_id', membersIds)
          .like('nombre', `${activoNombrePrefix}%`);
      }
    }

    const { error } = await supabase
      .from('actividad')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  asignarJurado: async () => {
    return null;
  },

  obtenerAsignaciones: async () => {
    return [];
  },

  buscarTalento: async () => {
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
    // Primero, verificamos si hay cupos y la fecha/hora
    const { data: itemData, error: itemError } = await supabase
      .from('actividad')
      .select('cupos, fecha, hora')
      .eq('id', actividadId)
      .single();
      
    if (itemError) throw itemError;

    // Validamos el límite de tiempo para inscripción (1 hora desde el inicio)
    if (itemData.fecha && itemData.hora) {
      const startStr = `${itemData.fecha}T${itemData.hora}`;
      const courseStart = new Date(startStr);
      if (!isNaN(courseStart.getTime())) {
        const now = new Date();
        const oneHour = 60 * 60 * 1000; // 1 hora en ms
        const courseEndEnrollment = new Date(courseStart.getTime() + oneHour);
        if (now > courseEndEnrollment) {
          throw new Error('La inscripción a esta actividad ya no está permitida porque ha finalizado.');
        }
      }
    }

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
          .select('titulo, fecha, hora, ubicacion, modalidad, costo, tipo_actividad:tipo_actividad_id(nombre)')
          .eq('id', actividadId)
          .single();

        brevoService.notificarInscripcionCurso({
          email: miembro.correoElectronico,
          nombre: miembro.nombre,
          curso: { 
            ...itemInfo, 
            nombre: itemInfo.titulo,
            tipo_nombre: itemInfo.tipo_actividad?.nombre || 'General'
          },
          miembroId
        }).catch(err => console.error('[Brevo] Error en email de inscripcion:', err));
      }
    } catch (emailErr) {
      console.error('[Brevo] Error enviando confirmación de inscripción:', emailErr);
    }

    return true;
  }
};
