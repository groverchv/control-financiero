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

  cancelarActividad: async (id) => {
    // 1. Obtener datos de la actividad y sus inscritos
    const { data: actividad, error: actErr } = await supabase
      .from('actividad')
      .select('*, tipo_actividad(nombre)')
      .eq('id', id)
      .single();
    if (actErr) throw actErr;

    const { data: inscritos, error: insErr } = await supabase
      .from('inscripcion')
      .select('id, miembro_id, estado, miembro:miembro_id(id, nombre, "correoElectronico")')
      .eq('actividad_id', id);
    if (insErr) throw insErr;

    // 2. Marcar actividad como cancelada
    const { error: updErr } = await supabase
      .from('actividad')
      .update({ estado: 'cancelado', publicado: false })
      .eq('id', id);
    if (updErr) throw updErr;

    // 3. Procesar inscritos para devolución si pagaron
    if (inscritos && inscritos.length > 0) {
      const inscripcionIds = inscritos.map(ins => ins.id);
      
      // Update associated paid incomes to 'reembolso_pendiente'
      await supabase
        .from('ingreso')
        .update({ estado: 'reembolso_pendiente' })
        .in('inscripcion_id', inscripcionIds)
        .in('estado', ['pagada', 'pagado']);

      const destinatarios = inscritos
        .filter(ins => ins.estado === 'pagado' && ins.miembro && ins.miembro.correoElectronico)
        .map(ins => ({
          id: ins.miembro.id,
          email: ins.miembro.correoElectronico,
          nombre: ins.miembro.nombre
        }));

      if (destinatarios.length > 0) {
        // Notificar cancelación vía Brevo
        try {
          await brevoService.notificarCancelacionActividad({
            destinatarios,
            curso: {
              nombre: actividad.titulo,
              fecha: actividad.fecha,
              costo: actividad.costo
            }
          });
        } catch (emailErr) {
          console.error('[Brevo] Error al enviar notificaciones de cancelación:', emailErr);
        }
      }

      // Para cada inscrito que ha pagado, crear notificación de reembolso
      for (const ins of inscritos) {
        if (ins.estado === 'pagado') {
          await supabase.from('notificacion').insert([{
            miembro_id: ins.miembro_id,
            titulo: 'Actividad Cancelada - Reembolso Pendiente',
            descripcion: `La actividad "${actividad.titulo}" ha sido cancelada. Usted entra en modo de devolución. Por favor contacte con administración para su reembolso de Bs. ${actividad.costo}.`,
            estado: 'pendiente'
          }]);
        }
      }

      // Eliminar deudas activas si no habían pagado aún
      const membersNoPagaron = inscritos.filter(ins => ins.estado !== 'pagado').map(ins => ins.miembro_id);
      if (membersNoPagaron.length > 0) {
        const activoNombrePrefix = `Inscripción Curso: ${actividad.titulo}`;
        await supabase
          .from('activos')
          .delete()
          .in('miembro_id', membersNoPagaron)
          .like('nombre', `${activoNombrePrefix}%`);
      }
    }

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

    // Volver a obtener para incluir todas las relaciones (similar a obtenerActividades)
    const { data: actFull } = await supabase
      .from('actividad')
      .select('*, tipo_actividad(nombre), archivo(url), jurado(miembro(nombre, "apellidoPaterno", "apellidoMaterno"))')
      .eq('id', nuevaAct.id)
      .single();

    return { 
      ...actFull, 
      nombre: actFull?.titulo || nuevaAct.titulo,
      tipo_nombre: actFull?.tipo_actividad?.nombre || 'General',
      imagen: actFull?.archivo?.[0]?.url || null,
      jurados: actFull?.jurado?.map(j => `${j.miembro?.nombre} ${j.miembro?.apellidoPaterno || ''}`.trim()) || []
    };
  },

  obtenerActividades: async () => {
    const { data, error } = await supabase
      .from('actividad')
      .select('*, tipo_actividad(id, nombre), archivo(url), jurado(miembro(nombre, "apellidoPaterno", "apellidoMaterno")), inscripcion(id)')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({ 
      ...d, 
      nombre: d.titulo,
      tipo_nombre: d.tipo_actividad?.nombre || 'General',
      imagen: d.archivo?.[0]?.url || null,
      jurados: d.jurado?.map(j => `${j.miembro?.nombre} ${j.miembro?.apellidoPaterno || ''}`.trim()) || [],
      inscritos_count: d.inscripcion?.length || 0
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

    const { error } = await supabase
      .from('actividad')
      .update(finalUpdates)
      .eq('id', id);

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

      if (finalUpdates.titulo !== undefined && (finalUpdates.titulo || '') !== (currentAct.titulo || '')) {
        changesList.push(`<li>El título de la actividad cambió de "<strong>${currentAct.titulo}</strong>" a "<strong>${finalUpdates.titulo}</strong>".</li>`);
        changesSimple.push(`Título ("${currentAct.titulo}" -> "${finalUpdates.titulo}")`);
      }
      if (finalUpdates.descripcion !== undefined && (finalUpdates.descripcion || '') !== (currentAct.descripcion || '')) {
        changesList.push(`<li>La descripción de la actividad fue actualizada.</li>`);
        changesSimple.push(`Descripción actualizada`);
      }
      if (finalUpdates.requisitos !== undefined && (finalUpdates.requisitos || '') !== (currentAct.requisitos || '')) {
        changesList.push(`<li>Los requisitos de la actividad fueron actualizados.</li>`);
        changesSimple.push(`Requisitos actualizados`);
      }
      if (finalUpdates.fecha !== undefined && finalUpdates.fecha !== currentAct.fecha) {
        const oldFecha = new Date(currentAct.fecha + 'T00:00:00').toLocaleDateString('es-ES');
        const newFecha = new Date(finalUpdates.fecha + 'T00:00:00').toLocaleDateString('es-ES');
        changesList.push(`<li>La fecha cambió de <strong>${oldFecha}</strong> a <strong>${newFecha}</strong>.</li>`);
        changesSimple.push(`Fecha (${oldFecha} -> ${newFecha})`);
      }
      if (finalUpdates.hora !== undefined && finalUpdates.hora !== currentAct.hora) {
        changesList.push(`<li>La hora de inicio cambió de <strong>${currentAct.hora ? currentAct.hora.substring(0, 5) : '--:--'} Hrs</strong> a <strong>${finalUpdates.hora ? finalUpdates.hora.substring(0, 5) : '--:--'} Hrs</strong>.</li>`);
        changesSimple.push(`Hora (${currentAct.hora ? currentAct.hora.substring(0, 5) : '--:--'} -> ${finalUpdates.hora ? finalUpdates.hora.substring(0, 5) : '--:--'})`);
      }
      if (finalUpdates.ubicacion !== undefined && (finalUpdates.ubicacion || '') !== (currentAct.ubicacion || '')) {
        changesList.push(`<li>La ubicación cambió de "<strong>${currentAct.ubicacion || 'Sin especificar'}</strong>" a "<strong>${finalUpdates.ubicacion || 'Sin especificar'}</strong>".</li>`);
        changesSimple.push(`Ubicación ("${currentAct.ubicacion || 'Sin especificar'}" -> "${finalUpdates.ubicacion || 'Sin especificar'}")`);
      }
      if (finalUpdates.modalidad !== undefined && finalUpdates.modalidad !== currentAct.modalidad) {
        changesList.push(`<li>La modalidad cambió de <strong style="text-transform:capitalize;">${currentAct.modalidad}</strong> a <strong style="text-transform:capitalize;">${finalUpdates.modalidad}</strong>.</li>`);
        changesSimple.push(`Modalidad (${currentAct.modalidad} -> ${finalUpdates.modalidad})`);
      }
      if (finalUpdates.costo !== undefined && Number(finalUpdates.costo) !== Number(currentAct.costo)) {
        changesList.push(`<li>El costo de inscripción cambió de <strong>Bs. ${currentAct.costo}</strong> a <strong>Bs. ${finalUpdates.costo}</strong>.</li>`);
        changesSimple.push(`Costo (Bs. ${currentAct.costo} -> Bs. ${finalUpdates.costo})`);
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
          .select('id, miembro_id, estado, miembro:miembro_id(id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado)')
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
              // R23: Gestionar deudas y anulaciones
              const membersIds = inscritos.map(ins => ins.miembro_id);
              const inscripcionIds = inscritos.map(ins => ins.id);

              // Update associated paid incomes to 'reembolso_pendiente'
              await supabase
                .from('ingreso')
                .update({ estado: 'reembolso_pendiente' })
                .in('inscripcion_id', inscripcionIds)
                .in('estado', ['pagada', 'pagado']);
              
              // Notificar reembolso si ya pagaron
              for (const ins of inscritos) {
                if (ins.estado === 'pagado') {
                  await supabase.from('notificacion').insert([{
                    miembro_id: ins.miembro_id,
                    titulo: 'Inscripción Anulada - Reembolso Pendiente',
                    descripcion: `Due al cambio crítico de datos en la actividad "${currentAct.titulo}", su inscripción ha sido anulada. Como el pago ya fue realizado, se ha habilitado su modo de devolución de Bs. ${currentAct.costo}.`,
                    estado: 'pendiente'
                  }]);
                }
              }

              if (membersIds.length > 0) {
                // Eliminar deudas activas asociadas solo si NO han pagado aún
                const membersNoPagaron = inscritos.filter(ins => ins.estado !== 'pagado').map(ins => ins.miembro_id);
                if (membersNoPagaron.length > 0) {
                  const activoNombrePrefix = `Inscripción Curso: ${currentAct.titulo}`;
                  await supabase
                    .from('activos')
                    .delete()
                    .in('miembro_id', membersNoPagaron)
                    .like('nombre', `${activoNombrePrefix}%`);
                }

                // Eliminar las inscripciones
                await supabase
                  .from('inscripcion')
                  .delete()
                  .in('miembro_id', membersIds)
                  .eq('actividad_id', id);

                // Devolver cupos a la actividad
                const { data: actNow } = await supabase.from('actividad').select('cupos').eq('id', id).single();
                await supabase
                  .from('actividad')
                  .update({ cupos: (actNow?.cupos || 0) + inscritos.length })
                  .eq('id', id);
              }
            }
          }
        }
      }
    }

    // Volver a obtener la actividad completa para devolver el objeto con todas las relaciones (imagen, tipo, etc.)
    const { data: updatedAct, error: fetchErr } = await supabase
      .from('actividad')
      .select('*, tipo_actividad(nombre), archivo(url), jurado(miembro(nombre, "apellidoPaterno", "apellidoMaterno"))')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    return { 
      ...updatedAct, 
      nombre: updatedAct.titulo,
      tipo_nombre: updatedAct.tipo_actividad?.nombre || 'General',
      imagen: updatedAct.archivo?.[0]?.url || null,
      jurados: updatedAct.jurado?.map(j => `${j.miembro?.nombre} ${j.miembro?.apellidoPaterno || ''}`.trim()) || []
    };
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
        .select('id, miembro_id')
        .eq('actividad_id', id);

      if (inscritos && inscritos.length > 0) {
        const inscripcionIds = inscritos.map(ins => ins.id);
        const { data: ingresos, error: ingresosError } = await supabase
          .from('ingreso')
          .select('id, estado, monto')
          .in('inscripcion_id', inscripcionIds);
        
        if (ingresosError) throw ingresosError;

        const tienePagosPendientes = (ingresos || []).some(
          ing => ing.estado !== 'devolucion' && Number(ing.monto) > 0
        );

        if (tienePagosPendientes) {
          throw new Error('No se puede eliminar la actividad porque existen inscritos con pagos pendientes de devolución.');
        }

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

  asignarJurado: async (payload) => {
    // Si es actividad del sistema, verificar que no esté finalizada/cancelada
    if (payload.actividad_id) {
      const { data: act } = await supabase
        .from('actividad')
        .select('*')
        .eq('id', payload.actividad_id)
        .single();
      
      if (act?.estado === 'finalizado' || act?.estado === 'cancelado') {
        throw new Error('No se puede asignar jurados a una actividad que ya ha finalizado o ha sido cancelada.');
      }
    }

    const { data, error } = await supabase.from('jurado').insert([{
      actividad_id: payload.actividad_id || null,
      actividad_externa: payload.actividad_externa || null,
      miembro_id: payload.miembro_id,
      descripcion: payload.descripcion
    }]).select();

    if (error) {
      if (error.code === '23505') throw new Error('El miembro ya es jurado en esta actividad.');
      throw error;
    }
    return data[0];
  },

  eliminarJurado: async (id) => {
    // Verificar si la actividad asociada está finalizada/cancelada
    const { data: jurado } = await supabase
      .from('jurado')
      .select('*, actividad(*)')
      .eq('id', id)
      .single();

    if (jurado?.actividad) {
      if (jurado.actividad.estado === 'finalizado' || jurado.actividad.estado === 'cancelado') {
        throw new Error('No se puede retirar un jurado de una actividad que ya ha finalizado o ha sido cancelada.');
      }
    }

    const { error } = await supabase.from('jurado').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  buscarTalento: async (criterio) => {
    const { data, error } = await supabase
      .from('miembro')
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", profesion, biografia')
      .or(`profesion.ilike.%${criterio}%,biografia.ilike.%${criterio}%,nombre.ilike.%${criterio}%`)
      .eq('estado', 'activo');

    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      nombre: `${d.nombre} ${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''}`.trim(),
      email: d.correoElectronico,
      especialidad: d.profesion || 'No especificada',
      experiencia: 'N/A',
      resumen: d.biografia
    }));
  },

  obtenerActividadPorId: async (id) => {
    const { data, error } = await supabase
      .from('actividad')
      .select('*, tipo_actividad(nombre), archivo(url), jurado(miembro(nombre, "apellidoPaterno", "apellidoMaterno"))')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { 
      ...data, 
      nombre: data.titulo,
      tipo_nombre: data.tipo_actividad?.nombre || 'General',
      imagen: data.archivo?.[0]?.url || null,
      jurados: data.jurado?.map(j => `${j.miembro?.nombre} ${j.miembro?.apellidoPaterno || ''} ${j.miembro?.apellidoMaterno || ''}`.trim()) || []
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
      .select('titulo, cupos, fecha, hora, costo')
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
  },

  desinscribirSocio: async (miembroId, actividadId) => {
    const { error: deleteError } = await supabase
      .from('inscripcion')
      .delete()
      .eq('miembro_id', miembroId)
      .eq('actividad_id', actividadId);

    if (deleteError) throw deleteError;

    const { data: act } = await supabase
      .from('actividad')
      .select('cupos')
      .eq('id', actividadId)
      .single();

    if (act) {
      await supabase
        .from('actividad')
        .update({ cupos: (act.cupos || 0) + 1 })
        .eq('id', actividadId);
    }

    return true;
  }
};
