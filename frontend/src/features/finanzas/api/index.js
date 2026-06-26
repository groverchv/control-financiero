import { supabase } from '../../../services/supabase';
import { brevoService } from '../../../services/brevo';
import { blockchainService } from '../../../services/blockchain';
import { apiCache, withCache } from '../../../utils/apiCache';
import { withWriteQueue, applyPendingQueueToData } from '../../../utils/offlineQueue';

export const finanzasApi = {
  // Nota: 'cuotas' ya no existe en el esquema nuevo. Se mapea a 'ingreso' temporalmente o se marca como pendiente.
  registrarPago: withWriteQueue('ingreso', 'registrarPago', async (pago) => {
    apiCache.invalidate('finanzas');
    const miembroId = pago.miembroId || pago.miembro_id || null;
    const { data, error } = await supabase
      .from('ingreso')
      .insert([{
        miembro_id: miembroId,
        registrado_por: pago.registradoPor || null,
        tipo_ingreso_id: pago.tipo_ingreso_id || null,
        monto: pago.monto,
        fecha: pago.fecha,
        descripcion: pago.descripcion || 'Ingreso',
        estado: pago.estado || 'pagada',
        inscripcion_id: pago.inscripcionId || null,
      }])
      .select();

    if (error) throw error;
    const pagoRegistrado = data?.[0];

    // Registrar archivo si se proporcionó una URL de comprobante
    if (pago.comprobanteUrl && pagoRegistrado) {
      const { data: archData } = await supabase.from('archivo').insert([{
        ingreso_id: pagoRegistrado.id,
        url: pago.comprobanteUrl,
        tipo: 'comprobante_ingreso'
      }]).select();

      // Sellar el archivo en blockchain
      if (archData?.[0]) {
        blockchainService.sellarYActualizar('archivo', archData[0], pago.registradoPor || 'sistema');
      }
    }

    // Sellar el ingreso en blockchain (en segundo plano para no bloquear el UI)
    blockchainService.sellarYActualizar('ingreso', pagoRegistrado, pago.registradoPor || 'sistema');

    // Si el pago está vinculado a una inscripción de actividad, marcarla como pagada
    if (pago.inscripcionId && pagoRegistrado) {
      await supabase
        .from('inscripcion')
        .update({ estado: 'pagado' })
        .eq('id', pago.inscripcionId);
    }

    // Si el pago es de tipo cuota mensual/inscripción o la descripción indica que es pago de membresía/inscripción, marcar la cuota más antigua pendiente como pagada
    const esPagoCuotaOMembresia = 
      pago.tipo_ingreso_id === 'fb06aeef-2529-425b-b131-ff09466a0a83' ||
      pago.tipo_ingreso_id === '6968c28b-d79f-4cfa-86ef-b1674b93ac8e' ||
      (pago.descripcion && (
        pago.descripcion.toLowerCase().includes('cuota') ||
        pago.descripcion.toLowerCase().includes('membres') ||
        pago.descripcion.toLowerCase().includes('inscrip')
      ));

    if (miembroId && esPagoCuotaOMembresia && pagoRegistrado) {
      try {
        const { data: cuotasPendientes } = await supabase
          .from('cuota_membresia')
          .select('id')
          .eq('miembro_id', miembroId)
          .eq('estado', 'pendiente')
          .order('creacion', { ascending: true })
          .limit(1);

        if (cuotasPendientes && cuotasPendientes.length > 0) {
          await supabase
            .from('cuota_membresia')
            .update({ estado: 'pagado', ingreso_id: pagoRegistrado.id })
            .eq('id', cuotasPendientes[0].id);
        }
      } catch (err) {
        console.error('[registrarPago] Error vinculando cuota_membresia:', err);
      }
    }


    // Enviar recibo de pago al socio si existe miembroId (en segundo plano)
    try {
      if (miembroId) {
        const { data: miembro } = await supabase
          .from('miembro')
          .select('nombre, "correoElectronico"')
          .eq('id', miembroId)
          .single();

        // Calcular cuotas que quedan pendientes después de este pago
        let cuotasPendientesRestantes = 0;
        try {
          const historial = await finanzasApi.obtenerHistorialCuotasMiembro();
          const dataMiembro = historial.find(h => h.miembro.id === miembroId);
          cuotasPendientesRestantes = dataMiembro?.mesesDeuda || 0;
        } catch {
          // No es crítico si falla
        }

        brevoService.notificarPagoRegistrado({
          email: miembro?.correoElectronico || 'no-reply@control.com',
          nombre: miembro?.nombre || 'Socio',
          monto: pago.monto,
          fecha: pago.fecha || new Date().toISOString().split('T')[0],
          concepto: pago.descripcion || 'Cuota de membresía',
          miembroId,
          cuotasPendientes: cuotasPendientesRestantes,
        }).catch(err => console.error('[Brevo] Error enviando recibo de pago:', err));

        // Registrar notificación en el sistema (avisos en la web)
        try {
          await supabase.from('notificacion').insert([{
            miembro_id: miembroId,
            titulo: 'Pago Registrado',
            descripcion: `Se ha registrado exitosamente un pago por Bs. ${Number(pago.monto).toFixed(2)}: ${pago.descripcion || 'Cuota de membresía'}.`,
            estado: 'pendiente'
          }]);
        } catch (notifErr) {
          console.error('[registrarPago] Error insertando notificación en BD:', notifErr);
        }
      }
    } catch (emailErr) {
      console.error('[Brevo] Error enviando recibo de pago:', emailErr);
    }

    // R15: Recargar el objeto completo (con tipo, socio y archivos) para actualizar la UI sin F5
    const { data: fullPago, error: fetchError } = await supabase
      .from('ingreso')
      .select(`
        *,
        tipo:tipo_ingreso(nombre),
        registrador:miembro!registrado_por(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
        socio:miembro!miembro_id(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
        archivos:archivo(url, tipo)
      `)
      .eq('id', pagoRegistrado.id)
      .single();

    if (fetchError) return pagoRegistrado;

    return {
      ...fullPago,
      miembroId: fullPago.miembro_id,
      socio_nombre: fullPago.socio ? `${fullPago.socio.nombre} ${fullPago.socio.apellidoPaterno || ''} ${fullPago.socio.apellidoMaterno || ''}`.trim() : 'Sin Asignar',
      socio_correo: fullPago.socio?.correoElectronico || null,
      socio_telefono: fullPago.socio?.telefono || null,
      socio_rol: fullPago.socio?.rol || null,
      tipo_ingreso_nombre: fullPago.tipo?.nombre || 'Ingreso',
      registrado_por_nombre: fullPago.registrador ? `${fullPago.registrador.nombre} ${fullPago.registrador.apellidoPaterno || ''} ${fullPago.registrador.apellidoMaterno || ''}`.trim() : 'Sistema',
      registrado_por_correo: fullPago.registrador?.correoElectronico || null,
      registrado_por_telefono: fullPago.registrador?.telefono || null,
      registrado_por_rol: fullPago.registrador?.rol || null,
      comprobanteUrl: fullPago.archivos && fullPago.archivos.length > 0 ? fullPago.archivos[0].url : null
    };
  }),

  devolverIngreso: async (id, usuarioId) => {
    apiCache.invalidate('finanzas');
    // 1. Obtener el ingreso y verificar si está ligado a una inscripción
    const { data: currentIngreso, error: fetchErr } = await supabase
      .from('ingreso')
      .select(`
        miembro_id, 
        inscripcion_id, 
        descripcion, 
        monto,
        inscripcion(id, actividad:actividad_id(id, titulo, costo))
      `)
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    // Obtener los datos del usuario administrador que realiza la devolución
    let infoRefund = 'Sistema';
    if (usuarioId) {
      try {
        const { data: miembro } = await supabase
          .from('miembro')
          .select('nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol')
          .eq('id', usuarioId)
          .maybeSingle();
        if (miembro) {
          const nombreCompleto = `${miembro.nombre} ${miembro.apellidoPaterno || ''} ${miembro.apellidoMaterno || ''}`.trim();
          infoRefund = `${nombreCompleto} (${miembro.rol || 'Sistema'}) [${miembro.correoElectronico || 'Sin Correo'} | Tel: ${miembro.telefono || '—'}]`;
        }
      } catch (e) {
        console.error('Error fetching refund user info:', e);
      }
    }

    const activityCost = currentIngreso?.inscripcion?.actividad?.costo;
    const esRefundablePorCosto = activityCost !== undefined && Number(currentIngreso.monto) > Number(activityCost);

    let nuevoMonto = 0;
    let nuevoEstado = 'devolucion';
    let refundDiff = Number(currentIngreso.monto);

    if (esRefundablePorCosto) {
      nuevoMonto = Number(activityCost);
      nuevoEstado = 'pagado';
      refundDiff = Number(currentIngreso.monto) - nuevoMonto;
    }

    const nuevaDesc = esRefundablePorCosto
      ? `${currentIngreso?.descripcion || ''} [Reembolso de excedente de Bs. ${refundDiff.toFixed(2)} por cambio de costo procesado por: ${infoRefund}]`.trim()
      : `${currentIngreso?.descripcion || ''} [Devuelto por: ${infoRefund}]`.trim();

    const { data, error } = await supabase
      .from('ingreso')
      .update({ monto: nuevoMonto, estado: nuevoEstado, descripcion: nuevaDesc })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Crear notificación para el socio
    try {
      if (currentIngreso?.miembro_id) {
        await supabase.from('notificacion').insert([{
          miembro_id: currentIngreso.miembro_id,
          titulo: 'Reembolso Procesado',
          descripcion: esRefundablePorCosto
            ? `Se ha procesado exitosamente el reembolso del excedente de costo para: "${currentIngreso.descripcion || 'Inscripción'}". Monto devuelto: Bs. ${refundDiff.toFixed(2)}.`
            : `Se ha procesado exitosamente el reembolso para: "${currentIngreso.descripcion || 'Inscripción'}". Monto devuelto: Bs. ${refundDiff.toFixed(2)}.`,
          estado: 'pendiente'
        }]);
      }
    } catch (notifErr) {
      console.error('[Notif] Error guardando notificación de devolución:', notifErr);
    }

    // Si tiene una inscripción ligada, eliminarla y regresar el cupo
    if (currentIngreso?.inscripcion_id) {
      // Obtener la actividad_id asociada a la inscripción
      const { data: inscripcion, error: insErr } = await supabase
        .from('inscripcion')
        .select('actividad_id')
        .eq('id', currentIngreso.inscripcion_id)
        .maybeSingle();

      if (!insErr && inscripcion?.actividad_id) {
        // Eliminar inscripción
        await supabase
          .from('inscripcion')
          .delete()
          .eq('id', currentIngreso.inscripcion_id);

        // Devolver el cupo a la actividad
        const { data: actNow } = await supabase
          .from('actividad')
          .select('cupos')
          .eq('id', inscripcion.actividad_id)
          .maybeSingle();

        if (actNow) {
          await supabase
            .from('actividad')
            .update({ cupos: (actNow.cupos || 0) + 1 })
            .eq('id', inscripcion.actividad_id);
        }
      }
    }
    
    // Sellar la devolución en blockchain (en segundo plano)
    if (data?.[0]) {
      blockchainService.sellarYActualizar('ingreso', data[0], 'sistema-devolucion');
    }
    
    return data?.[0];
  },

  obtenerCuotas: async (miembroId) => {
    const cacheKey = `finanzas:cuotas:${miembroId || 'all'}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return applyPendingQueueToData('ingreso', cached);

    let query = supabase.from('ingreso').select(`
      *,
      tipo:tipo_ingreso(nombre),
      registrador:miembro!registrado_por(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
      socio:miembro!miembro_id(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
      archivos:archivo(url, tipo),
      inscripcion(id, actividad:actividad_id(id, titulo, costo))
    `).order('creacion', { ascending: false });

    if (miembroId) {
      query = query.eq('miembro_id', miembroId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const result = data?.map(d => ({
      ...d,
      miembroId: d.miembro_id,
      socio_nombre: d.socio ? `${d.socio.nombre} ${d.socio.apellidoPaterno || ''} ${d.socio.apellidoMaterno || ''}`.trim() : 'Sin Asignar',
      socio_correo: d.socio?.correoElectronico || null,
      socio_telefono: d.socio?.telefono || null,
      socio_rol: d.socio?.rol || null,
      tipo_ingreso_nombre: d.tipo?.nombre || 'Ingreso',
      registrado_por_nombre: d.registrador ? `${d.registrador.nombre} ${d.registrador.apellidoPaterno || ''} ${d.registrador.apellidoMaterno || ''}`.trim() : 'Sistema',
      registrado_por_correo: d.registrador?.correoElectronico || null,
      registrado_por_telefono: d.registrador?.telefono || null,
      registrado_por_rol: d.registrador?.rol || null,
      comprobanteUrl: d.archivos?.find(a => a.tipo === 'comprobante_ingreso')?.url || d.archivos?.[0]?.url || null,
      inscripcion: d.inscripcion
    })) || [];

    apiCache.set(cacheKey, result);
    return applyPendingQueueToData('ingreso', result);
  },

  // ── Historial de cuotas de membresía por miembro ──────────────────────────
  obtenerHistorialCuotasMiembro: async (forceRefresh = false) => {
    const cacheKey = 'finanzas:historial_cuotas';
    if (!forceRefresh && !navigator.onLine) {
      const cached = apiCache.get(cacheKey);
      if (cached) return cached;
    }

    // 1. Obtener todos los miembros con sus columnas de control
    const { data: miembros, error: mErr } = await supabase
      .from('miembro')
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, creacion, fecha_pausa, dias_pausados, fecha_proxima_cuota, tiempo_restante_cuota')
      .order('creacion', { ascending: true });
    if (mErr) throw mErr;

    // 2. Obtener todas las cuotas persistidas
    const { data: cuotasFisicas, error: cErr } = await supabase
      .from('cuota_membresia')
      .select('*')
      .order('creacion', { ascending: true });
    if (cErr) throw cErr;

    // 3. Obtener la última configuración
    const { data: configUltima } = await supabase
      .from('configuracion_cuotas')
      .select('*')
      .order('creacion', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3.5. Auto-generar cuotas vencidas si no está pausado
    let huboCambios = false;
    if (configUltima && !configUltima.pausado && miembros && miembros.length > 0) {
      const frecuenciaToMs = (freq) => {
        if (freq === '1_minuto') return 1 * 60 * 1000;
        if (freq === '3_minutos') return 3 * 60 * 1000;
        if (freq === '5_minutos') return 5 * 60 * 1000;
        if (freq === '1_dia')     return 1 * 24 * 60 * 60 * 1000;
        if (freq === '2_dias')    return 2 * 24 * 60 * 60 * 1000;
        if (freq === '3_dias')    return 3 * 24 * 60 * 60 * 1000;
        if (freq === 'semana')    return 7 * 24 * 60 * 60 * 1000;
        if (freq === 'trimestre') return 90 * 24 * 60 * 60 * 1000;
        return 30 * 24 * 60 * 60 * 1000; // 'mes' default
      };

      const getPeriodLabel = (date, freq) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        
        if (freq === '1_minuto' || freq === '3_minutos' || freq === '5_minutos') {
          const hh = String(date.getHours()).padStart(2, '0');
          const min = String(date.getMinutes()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
        } else if (freq === '1_dia' || freq === '2_dias' || freq === '3_dias' || freq === 'semana') {
          return `Día ${yyyy}-${mm}-${dd}`;
        } else {
          return `${yyyy}-${mm}`;
        }
      };

      const msInterval = frecuenciaToMs(configUltima.frecuencia);
      const now = new Date();

      for (const m of miembros) {
        if (m.estado === 'activo' && m.fecha_proxima_cuota) {
          let nextDue = new Date(m.fecha_proxima_cuota);
          if (nextDue <= now) {
            const cuotasNuevas = [];
            while (nextDue <= now) {
              const periodStr = getPeriodLabel(nextDue, configUltima.frecuencia);
              cuotasNuevas.push({
                miembro_id: m.id,
                periodo: periodStr,
                monto_esperado: configUltima.monto_cuota || 20,
                estado: 'pendiente',
                creacion: nextDue.toISOString()
              });
              nextDue = new Date(nextDue.getTime() + msInterval);
            }

            if (cuotasNuevas.length > 0) {
              huboCambios = true;
              await supabase.from('cuota_membresia').insert(cuotasNuevas);
              await supabase
                .from('miembro')
                .update({ fecha_proxima_cuota: nextDue.toISOString() })
                .eq('id', m.id);
            }
          }
        }
      }
    }

    // 4. Si hubo cambios, volver a consultar los datos para devolver los actualizados
    let miembrosFinales = miembros;
    let cuotasFisicasFinales = cuotasFisicas;
    if (huboCambios) {
      const { data: mNew } = await supabase
        .from('miembro')
        .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, creacion, fecha_pausa, dias_pausados, fecha_proxima_cuota, tiempo_restante_cuota')
        .order('creacion', { ascending: true });
      if (mNew) miembrosFinales = mNew;

      const { data: cNew } = await supabase
        .from('cuota_membresia')
        .select('*')
        .order('creacion', { ascending: true });
      if (cNew) cuotasFisicasFinales = cNew;
    }

    const result = (miembrosFinales || []).map(m => {
      const cronograma = (cuotasFisicasFinales || [])
        .filter(c => c.miembro_id === m.id)
        .map(c => ({
          id: c.id,
          mes: c.periodo,
          monto_esperado: Number(c.monto_esperado),
          pagado: c.estado === 'pagado',
          ingreso_id: c.ingreso_id,
          creacion: c.creacion,
          fechaVencimientoAjustada: c.creacion, // fallback para compatibilidad UI
        }))
        .sort((a, b) => new Date(a.creacion) - new Date(b.creacion));

      const mesesDeuda = cronograma.filter(c => !c.pagado).length;
      const mesesPagados = cronograma.filter(c => c.pagado).length;
      const proximaPendiente = cronograma.find(c => !c.pagado);

      return {
        miembro: {
          ...m,
          correoElectronico: m.correoElectronico // compatibilidad
        },
        cronograma,
        mesesDeuda,
        mesesPagados,
        proximaPendiente,
        fechaProximaCuota: m.fecha_proxima_cuota || null,
        pausado: configUltima?.pausado || false,
        fechaPausa: configUltima?.fecha_pausa || null,
      };
    });

    apiCache.set(cacheKey, result);
    return result;
  },


  _syncInProgressKeys: new Set(),

  sincronizarNotificacionesDeuda: async (historial, config) => {
    try {
      const { data: notifs } = await supabase
        .from('notificacion')
        .select('miembro_id, titulo')
        .ilike('titulo', 'Cuota generada:%');

      const { brevoService } = await import('../../../services/brevo.js');
      const montoCuota = config?.monto_cuota || 20;

      for (const { miembro, cronograma, proximaPendiente } of historial) {
        if (!proximaPendiente) continue;

        const tituloEsperado = `Cuota generada: ${proximaPendiente.mes}`;
        const syncKey = `${miembro.id}-${tituloEsperado}`;

        if (finanzasApi._syncInProgressKeys.has(syncKey)) continue;

        const yaNotificada = (notifs || []).some(n => n.miembro_id === miembro.id && n.titulo === tituloEsperado);

        if (!yaNotificada) {
          finanzasApi._syncInProgressKeys.add(syncKey);

          // Calcular cuotas pendientes anteriores (deudas acumuladas, excluye la más próxima)
          const cuotasPreviasPendientes = (cronograma || [])
            .filter(c => !c.pagado && c.mes !== proximaPendiente.mes)
            .map(c => ({ mes: c.mes, monto: montoCuota }));

          await brevoService.notificarPagoPendiente({
            email: miembro.correoElectronico || 'no-reply@control.com',
            nombre: `${miembro.nombre} ${miembro.apellidoPaterno || ''}`.trim(),
            monto: montoCuota,
            periodoKey: proximaPendiente.mes,
            miembroId: miembro.id,
            deudasExtra: cuotasPreviasPendientes,
          });
        }
      }
    } catch (err) {
      console.error('[finanzasApi] Error sincronizando notificaciones:', err);
    }
  },

  obtenerConfiguracionCuotas: async () => {
    const cacheKey = 'finanzas:config';
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('configuracion_cuotas')
      .select('*')
      .order('creacion', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.warn('[Config Cuotas]', error.message);
    
    const result = data || { pausado: false, fecha_pausa: null, dias_pausados: 0 };
    apiCache.set(cacheKey, result);
    return result;
  },

  togglePausaCuotas: async (pausar, configActual) => {
    apiCache.invalidate('finanzas');
    const hoy = new Date().toISOString();
    let payload;

    if (pausar) {
      payload = { pausado: true, fecha_pausa: hoy, dias_pausados: Number(configActual?.dias_pausados || 0) };
    } else {
      // Calcular días que estuvo pausado con precisión decimal para pausar minutos o segundos
      const diasAdicionales = configActual?.fecha_pausa
        ? (new Date() - new Date(configActual.fecha_pausa)) / (1000 * 60 * 60 * 24)
        : 0;
      payload = {
        pausado: false,
        fecha_pausa: null,
        dias_pausados: Number(configActual?.dias_pausados || 0) + diasAdicionales,
      };
    }

    const fullPayload = {
      frecuencia: configActual?.frecuencia || 'mes',
      monto_cuota: configActual?.monto_cuota || 20,
      dias_recordatorio_activos: configActual?.dias_recordatorio_activos || 5,
      ...payload
    };

    const { data, error } = await supabase
      .from('configuracion_cuotas')
      .insert([fullPayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  actualizarConfiguracionCuotas: async (payload) => {
    apiCache.invalidate('finanzas');

    // 1. Obtener la última configuración antes de guardar para ver la frecuencia anterior
    const { data: configActual } = await supabase
      .from('configuracion_cuotas')
      .select('*')
      .order('creacion', { ascending: false })
      .limit(1)
      .maybeSingle();

    const oldFreq = configActual?.frecuencia || 'mes';
    const newFreq = payload.frecuencia;

    const cleanPayload = { 
      dias_recordatorio_activos: configActual?.dias_recordatorio_activos || 5,
      ...payload 
    };
    delete cleanPayload.id;
    delete cleanPayload.creacion;
    delete cleanPayload.actualizacion;

    const executeSave = async (dataToSave) => {
      return await supabase
        .from('configuracion_cuotas')
        .insert([dataToSave])
        .select()
        .single();
    };

    try {
      // Guardar la nueva configuración
      const { data, error } = await executeSave(cleanPayload);
      if (error) throw error;

      // Siempre ejecutar la transición/actualización al guardar la configuración
      // Obtener todos los socios activos
      const { data: miembros } = await supabase
        .from('miembro')
        .select('id, creacion, fecha_proxima_cuota, estado')
        .eq('estado', 'activo');

      if (miembros && miembros.length > 0) {
        const frecuenciaToMs = (freq) => {
          if (freq === '1_minuto') return 1 * 60 * 1000;
          if (freq === '3_minutos') return 3 * 60 * 1000;
          if (freq === '5_minutos') return 5 * 60 * 1000;
          if (freq === '1_dia')     return 1 * 24 * 60 * 60 * 1000;
          if (freq === '2_dias')    return 2 * 24 * 60 * 60 * 1000;
          if (freq === '3_dias')    return 3 * 24 * 60 * 60 * 1000;
          if (freq === 'semana')    return 7 * 24 * 60 * 60 * 1000;
          if (freq === 'trimestre') return 90 * 24 * 60 * 60 * 1000;
          return 30 * 24 * 60 * 60 * 1000; // 'mes' default
        };

        const msToNewFreq = frecuenciaToMs(newFreq);
        const nextDue = new Date(Date.now() + msToNewFreq);

        if (oldFreq === 'mes' && newFreq === '1_dia') {
          // Transición mensual a diario: Generar cuotas para los días transcurridos en el mes
          for (const m of miembros) {
            let cycleStart;
            if (m.fecha_proxima_cuota) {
              // El ciclo actual comenzó un mes antes de la fecha próxima programada
              const prox = new Date(m.fecha_proxima_cuota);
              prox.setMonth(prox.getMonth() - 1);
              cycleStart = prox;
            } else {
              cycleStart = new Date(m.creacion);
            }

            // Ajustar al máximo entre cycleStart y fecha de creación del socio
            const minStart = new Date(m.creacion);
            if (cycleStart < minStart) {
              cycleStart = minStart;
            }

            const now = new Date();
            // Si por algún motivo cycleStart está en el futuro, no generar cuotas
            if (cycleStart < now) {
              const diffMs = now - cycleStart;
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

              // Insertar cuotas diarias para los días que ya pasaron
              if (diffDays > 0) {
                const cuotasNuevas = [];
                for (let i = 0; i < diffDays; i++) {
                  const dayDate = new Date(cycleStart.getTime() + i * 24 * 60 * 60 * 1000);
                  const yyyy = dayDate.getFullYear();
                  const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
                  const dd = String(dayDate.getDate()).padStart(2, '0');
                  const dateStr = `${yyyy}-${mm}-${dd}`;
                  
                  cuotasNuevas.push({
                    miembro_id: m.id,
                    periodo: `Día ${dateStr}`,
                    monto_esperado: payload.monto_cuota || 20,
                    estado: 'pendiente',
                    creacion: dayDate.toISOString(),
                  });
                }
                if (cuotasNuevas.length > 0) {
                  await supabase.from('cuota_membresia').insert(cuotasNuevas);
                }
              }
            }

            // Actualizar fecha de próxima cuota con el nuevo intervalo
            await supabase
              .from('miembro')
              .update({ fecha_proxima_cuota: nextDue.toISOString() })
              .eq('id', m.id);
          }
        } else {
          // Transición general para cualquier otra frecuencia
          for (const m of miembros) {
            await supabase
              .from('miembro')
              .update({ fecha_proxima_cuota: nextDue.toISOString() })
              .eq('id', m.id);
          }
        }
      }

      return data;
    } catch (err) {
      if (err.message?.includes('frecuencia') || err.message?.includes('monto_cuota') || err.code === '42703') {
        console.warn('[Supabase] Columnas nuevas no existen. Intentando guardar sin ellas.');
        const fallbackPayload = { ...cleanPayload };
        delete fallbackPayload.frecuencia;
        delete fallbackPayload.monto_cuota;
        const { data, error: errFallback } = await executeSave(fallbackPayload);
        if (errFallback) throw errFallback;
        return { ...data, _schemaWarning: true };
      }
      throw err;
    }
  },

  registrarEgreso: withWriteQueue('egreso', 'registrarEgreso', async (egreso) => {
    apiCache.invalidate('finanzas');
    // Convertir strings vacíos a null para campos UUID (Supabase no acepta '' en UUID)
    const miembroId = egreso.miembro_id || egreso.registradoPor || null;
    const tipoEgresoId = egreso.tipo_egreso_id && egreso.tipo_egreso_id.trim() !== '' ? egreso.tipo_egreso_id : null;
    const activoId = egreso.activo_id && egreso.activo_id.trim() !== '' ? egreso.activo_id : null;

    const { data, error } = await supabase
      .from('egreso')
      .insert([{
        miembro_id: miembroId,
        tipo_egreso_id: tipoEgresoId,
        activo_id: activoId,
        monto: Number(egreso.monto),
        concepto: egreso.concepto,
        descripcion: egreso.descripcion || null,
      }])
      .select();

    if (error) throw error;
    const egresoRegistrado = data?.[0];

    // Si hay activo asociado, actualizar el saldo pendiente del activo y amortizacion
    if (activoId && egresoRegistrado) {
      try {
        // Obtenemos un plan pendiente de amortizacion para este activo
        const { data: planesPendientes } = await supabase
          .from('plan_amortizacion')
          .select('*')
          .eq('activoId', activoId)
          .eq('estado', 'pendiente')
          .order('numero', { ascending: true })
          .limit(1);

        if (planesPendientes && planesPendientes.length > 0) {
          const cuotaAPagar = planesPendientes[0];
          const montoEgreso = Number(egreso.monto);
          const montoCuota = Number(cuotaAPagar.monto);
          
          if (montoEgreso >= montoCuota - 5) {
            // Pago total (o casi total)
            await supabase
              .from('plan_amortizacion')
              .update({ estado: 'pagado', monto: 0 }) // R17: Se marca como pagado y saldo 0
              .eq('id', cuotaAPagar.id);
          } else {
            // R17: Pago parcial
            await supabase
              .from('plan_amortizacion')
              .update({ monto: montoCuota - montoEgreso }) // Reducimos el monto de la cuota
              .eq('id', cuotaAPagar.id);
          }
        }

        // Verificar si el activo quedó pagado para actualizar su estado
        const { data: activoActualizado } = await supabase
          .from('activos')
          .select('saldo_pendiente')
          .eq('id', activoId)
          .single();
        
        if (activoActualizado && activoActualizado.saldo_pendiente <= 0) {
          await supabase
            .from('activos')
            .update({ estado: 'pagado' })
            .eq('id', activoId);
        }
      } catch (err) {
        console.warn('[Egreso] Error verificando estado y amortizacion del activo:', err);
      }
    }

    // Registrar archivo si se proporcionó una URL de comprobante
    if (egreso.comprobanteUrl && egresoRegistrado) {
      const { data: archData } = await supabase.from('archivo').insert([{
        egreso_id: egresoRegistrado.id,
        url: egreso.comprobanteUrl,
        tipo: 'comprobante_egreso'
      }]).select();

      // Sellar el archivo en blockchain
      if (archData?.[0]) {
        blockchainService.sellarYActualizar('archivo', archData[0], miembroId || 'sistema');
      }
    }

    // Sellar el egreso en blockchain
    blockchainService.sellarYActualizar('egreso', egresoRegistrado, miembroId || 'sistema');

    // R15: Recargar el objeto completo (con tipo, activo y archivos) para actualizar la UI sin F5
    const { data: fullEgreso, error: fetchError } = await supabase
      .from('egreso')
      .select(`
        *,
        tipo:tipo_egreso(nombre),
        registrador:miembro!miembro_id(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
        activo:activos!activo_id(nombre),
        archivos:archivo(url)
      `)
      .eq('id', egresoRegistrado.id)
      .single();

    if (fetchError) return egresoRegistrado;

    return {
      ...fullEgreso,
      categoria: fullEgreso.tipo?.nombre || 'Egreso',
      registrado_por_nombre: fullEgreso.registrador ? `${fullEgreso.registrador.nombre} ${fullEgreso.registrador.apellidoPaterno || ''} ${fullEgreso.registrador.apellidoMaterno || ''}`.trim() : 'Sistema',
      registrado_por_correo: fullEgreso.registrador?.correoElectronico || null,
      registrado_por_telefono: fullEgreso.registrador?.telefono || null,
      registrado_por_rol: fullEgreso.registrador?.rol || null,
      activo_nombre: fullEgreso.activo?.nombre || null,
      comprobanteUrl: fullEgreso.archivos && fullEgreso.archivos.length > 0 ? fullEgreso.archivos[0].url : null
    };
  }),

  obtenerEgresos: (() => {
    const cachedFn = withCache('finanzas:egresos', async () => {
      const { data, error } = await supabase
        .from('egreso')
        .select(`
          *,
          tipo:tipo_egreso(nombre),
          registrador:miembro!miembro_id(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
          activo:activos!activo_id(nombre),
          archivos:archivo(url)
        `)
        .order('creacion', { ascending: false });

      if (error) throw error;
      return data?.map(d => ({
        ...d,
        categoria: d.tipo?.nombre || 'Egreso',
        registrado_por_nombre: d.registrador ? `${d.registrador.nombre} ${d.registrador.apellidoPaterno || ''} ${d.registrador.apellidoMaterno || ''}`.trim() : 'Sistema',
        registrado_por_correo: d.registrador?.correoElectronico || null,
        registrado_por_telefono: d.registrador?.telefono || null,
        registrado_por_rol: d.registrador?.rol || null,
        activo_nombre: d.activo?.nombre || null,
        comprobanteUrl: d.archivos && d.archivos.length > 0 ? d.archivos[0].url : null
      })) || [];
    });
    return async (...args) => {
      const data = await cachedFn(...args);
      return applyPendingQueueToData('egreso', data);
    };
  })(),

  registrarIngresoExtra: async (ingreso) => {
    const { data, error } = await supabase
      .from('ingreso')
      .insert([{
        miembro_id: ingreso.registradoPor || ingreso.miembro_id,
        monto: ingreso.monto,
        fecha: ingreso.fecha || new Date().toISOString().split('T')[0],
        descripcion: ingreso.concepto || ingreso.descripcion,
      }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  obtenerIngresosExtras: async () => {
    const { data, error } = await supabase
      .from('ingreso')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  obtenerReportes: async () => {
    // La tabla reportes_financieros ya no existe. Habría que calcularlos al vuelo.
    return [];
  },

  obtenerFlujoCaja: async () => {
    // 1. Obtener suma de ingresos
    const { data: ingresos } = await supabase.from('ingreso').select('monto');
    const ingresosTotales = (ingresos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // 2. Obtener suma de egresos
    const { data: egresos } = await supabase.from('egreso').select('monto');
    const egresosTotales = (egresos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

    const saldoNeto = ingresosTotales - egresosTotales;

    return { ingresosTotales, egresosTotales, saldoNeto };
  },

  obtenerTiposIngreso: async () => {
    const { data, error } = await supabase.from('tipo_ingreso').select('*').order('creacion', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  crearTipoIngreso: async (nombre, descripcion = '') => {
    const { data, error } = await supabase.from('tipo_ingreso').insert([{ nombre, descripcion }]).select();
    if (error) throw error;
    return data?.[0];
  },

  actualizarTipoIngreso: async (id, nombre, descripcion = '') => {
    const { data, error } = await supabase.from('tipo_ingreso').update({ nombre, descripcion }).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  },

  eliminarTipoIngreso: async (id) => {
    const { error } = await supabase.from('tipo_ingreso').delete().eq('id', id);
    if (error) throw error;
  },

  obtenerTiposEgreso: async () => {
    const { data, error } = await supabase.from('tipo_egreso').select('*').order('creacion', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  crearTipoEgreso: async (nombre, descripcion = '') => {
    const { data, error } = await supabase.from('tipo_egreso').insert([{ nombre, descripcion }]).select();
    if (error) throw error;
    return data?.[0];
  },

  actualizarTipoEgreso: async (id, nombre, descripcion = '') => {
    const { data, error } = await supabase.from('tipo_egreso').update({ nombre, descripcion }).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  },

  eliminarTipoEgreso: async (id) => {
    const { error } = await supabase.from('tipo_egreso').delete().eq('id', id);
    if (error) throw error;
  },

  obtenerActivos: async () => {
    const { data, error } = await supabase.from('activos').select('id, nombre, saldo_pendiente, estado').order('nombre');
    if (error) throw error;
    return data || [];
  },
  
  sellarIngreso: async (id, registradoPor) => {
    const { data, error } = await supabase.from('ingreso').select('*').eq('id', id).single();
    if (error) throw error;
    return await blockchainService.sellarYActualizar('ingreso', data, registradoPor);
  },

  sellarEgreso: async (id, registradoPor) => {
    const { data, error } = await supabase.from('egreso').select('*').eq('id', id).single();
    if (error) throw error;
    return await blockchainService.sellarYActualizar('egreso', data, registradoPor);
  },

  verificarTipoIngresoEnUso: async (tipoId) => {
    const { count, error } = await supabase
      .from('ingreso')
      .select('id', { count: 'exact', head: true })
      .eq('tipo_ingreso_id', tipoId);
    if (error) throw error;
    return count > 0;
  },

  verificarTipoEgresoEnUso: async (tipoId) => {
    const { count, error } = await supabase
      .from('egreso')
      .select('id', { count: 'exact', head: true })
      .eq('tipo_egreso_id', tipoId);
    if (error) throw error;
    return count > 0;
  },

  /**
   * Obtener inscripciones de un miembro cuya actividad tiene costo > 0 y aún no están pagadas.
   * Se usa en el formulario de ingreso extra para vincular el pago a una inscripción.
   */
  obtenerInscripcionesPendientesPago: async (miembroId) => {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('id, estado, fecha_inscripcion, actividad:actividad_id(id, titulo, costo, fecha)')
      .eq('miembro_id', miembroId)
      .neq('estado', 'pagado')
      .order('fecha_inscripcion', { ascending: false });
    if (error) throw error;
    // Filtrar solo las actividades con costo mayor a 0
    return (data || []).filter(i => i.actividad && Number(i.actividad.costo) > 0);
  },

  obtenerHistorialActividades: async () => {
    // 1. Obtener inscripciones activas
    const { data: inscripciones, error: insErr } = await supabase
      .from('inscripcion')
      .select(`
        id,
        estado,
        fecha_inscripcion,
        miembro:miembro_id(
          id,
          nombre,
          apellidoPaterno,
          apellidoMaterno,
          correoElectronico
        ),
        actividad:actividad_id(
          id,
          titulo,
          costo,
          fecha,
          hora,
          tipo_actividad:tipo_actividad_id(
            nombre
          )
        ),
        ingreso(monto)
      `)
      .order('fecha_inscripcion', { ascending: false });

    if (insErr) throw insErr;

    const mappedInscripciones = (inscripciones || [])
      .filter(i => i.actividad && Number(i.actividad.costo) > 0)
      .map(i => {
        const totalPaid = i.ingreso && i.ingreso.length > 0
          ? i.ingreso.reduce((sum, ing) => sum + Number(ing.monto || 0), 0)
          : (i.estado === 'pagado' ? Number(i.actividad?.costo || 0) : 0);
        return {
          id: i.id,
          estado: i.estado,
          fecha_inscripcion: i.fecha_inscripcion,
          miembro_id: i.miembro?.id,
          socio_nombre: `${i.miembro?.nombre} ${i.miembro?.apellidoPaterno || ''} ${i.miembro?.apellidoMaterno || ''}`.trim(),
          socio_email: i.miembro?.correoElectronico || '',
          actividad_id: i.actividad?.id,
          actividad_titulo: i.actividad?.titulo || 'Actividad general',
          actividad_costo: Number(i.actividad?.costo || 0),
          actividad_fecha: i.actividad?.fecha,
          actividad_hora: i.actividad?.hora,
          actividad_tipo: i.actividad?.tipo_actividad?.nombre || 'General',
          total_pagado: totalPaid
        };
      });

    // 2. Obtener pagos de actividad huérfanos (inscripcion_id es null pero el tipo es Pago de Actividad)
    let mappedOrphans = [];
    try {
      const { data: orphanIngresos, error: ingErr } = await supabase
        .from('ingreso')
        .select(`
          id,
          estado,
          monto,
          creacion,
          descripcion,
          miembro:miembro_id(
            id,
            nombre,
            apellidoPaterno,
            apellidoMaterno,
            correoElectronico
          ),
          tipo:tipo_ingreso(nombre)
        `)
        .is('inscripcion_id', null);

      if (!ingErr && orphanIngresos) {
        mappedOrphans = orphanIngresos
          .filter(i => {
            const esTipoActividad = i.tipo?.nombre?.toLowerCase().includes('actividad');
            const esDescActividad = i.descripcion?.toLowerCase().includes('actividad') || i.descripcion?.toLowerCase().includes('inscrip');
            return esTipoActividad || esDescActividad;
          })
          .map(i => {
            let tituloExtraido = 'Actividad general';
            const match = i.descripcion?.match(/actividad:\s*([^\[\n]+)/i);
            if (match) {
              tituloExtraido = match[1].trim();
            } else if (i.descripcion) {
              // Limpiar la descripción de marcas de reembolso para el título
              tituloExtraido = i.descripcion.split('[')[0].replace('Pago de inscripción a actividad:', '').replace('Pago de inscripción:', '').trim();
            }
            return {
              id: i.id,
              estado: i.estado === 'devolucion' ? 'devolucion' : 'pagado',
              fecha_inscripcion: i.creacion,
              miembro_id: i.miembro?.id,
              socio_nombre: i.miembro ? `${i.miembro.nombre} ${i.miembro.apellidoPaterno || ''} ${i.miembro.apellidoMaterno || ''}`.trim() : 'Socio Eliminado',
              socio_email: i.miembro?.correoElectronico || '',
              actividad_id: null,
              actividad_titulo: tituloExtraido || 'Actividad general',
              actividad_costo: Number(i.monto),
              actividad_fecha: i.creacion ? i.creacion.split('T')[0] : null,
              actividad_hora: i.creacion && i.creacion.includes('T') ? i.creacion.split('T')[1].substring(0, 8) : null,
              actividad_tipo: i.tipo?.nombre || 'Pago de Actividad',
              total_pagado: Number(i.monto)
            };
          });
      }
    } catch (e) {
      console.error('Error fetching orphan ingresos:', e);
    }

    // Combinar ambos y ordenar por fecha de inscripción desc
    const combined = [...mappedInscripciones, ...mappedOrphans];
    combined.sort((a, b) => new Date(b.fecha_inscripcion) - new Date(a.fecha_inscripcion));
    return combined;
  }
};
