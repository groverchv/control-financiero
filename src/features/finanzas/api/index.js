import { supabase } from '../../../services/supabase';
import { brevoService } from '../../../services/brevo';
import { blockchainService } from '../../../services/blockchain';

export const finanzasApi = {
  // Nota: 'cuotas' ya no existe en el esquema nuevo. Se mapea a 'ingreso' temporalmente o se marca como pendiente.
  registrarPago: async (pago) => {
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

    // Enviar email de confirmación de pago al socio si existe miembroId (en segundo plano)
    try {
      if (miembroId) {
        const { data: miembro } = await supabase
          .from('miembro')
          .select('nombre, "correoElectronico"')
          .eq('id', miembroId)
          .single();

        if (miembro?.correoElectronico) {
          brevoService.notificarPagoRegistrado({
            email: miembro.correoElectronico,
            nombre: miembro.nombre,
            monto: pago.monto,
            fecha: pago.fecha || new Date().toLocaleDateString('es-ES'),
            concepto: pago.descripcion || 'Cuota mensual',
            miembroId
          }).catch(err => console.error('[Brevo] Error notificando pago registrado:', err));
        } else {
          // Si no tiene correo pero si es miembro, solo guardamos en BD
          await supabase.from('notificacion').insert([{
            miembro_id: miembroId,
            titulo: 'Pago registrado',
            descripcion: `Se registro su pago de Bs. ${pago.monto} por concepto de: ${pago.descripcion || 'Cuota mensual'}. Fecha: ${pago.fecha || new Date().toLocaleDateString('es-ES')}.`,
            estado: 'pendiente'
          }]);
        }
      }
    } catch (emailErr) {
      console.error('[Brevo] Error enviando confirmación de pago:', emailErr);
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
  },

  devolverIngreso: async (id, usuarioId) => {
    // 1. Obtener el ingreso y verificar si está ligado a una inscripción
    const { data: currentIngreso, error: fetchErr } = await supabase
      .from('ingreso')
      .select('inscripcion_id, descripcion')
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

    const nuevaDesc = `${currentIngreso?.descripcion || ''} [Devuelto por: ${infoRefund}]`.trim();

    const { data, error } = await supabase
      .from('ingreso')
      .update({ monto: 0, estado: 'devolucion', descripcion: nuevaDesc })
      .eq('id', id)
      .select();

    if (error) throw error;

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
    let query = supabase.from('ingreso').select(`
      *,
      tipo:tipo_ingreso(nombre),
      registrador:miembro!registrado_por(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
      socio:miembro!miembro_id(nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol),
      archivos:archivo(url, tipo)
    `).order('creacion', { ascending: false });

    if (miembroId) {
      query = query.eq('miembro_id', miembroId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data?.map(d => ({
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
    })) || [];
  },

  // ── Historial de cuotas de membresía por miembro ──────────────────────────
  obtenerHistorialCuotasMiembro: async () => {
    // Trae todos los miembros (activos e inactivos) con su fecha de creación y campos de pausa
    const { data: miembros, error: mErr } = await supabase
      .from('miembro')
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, creacion, fecha_pausa, dias_pausados')
      .order('creacion', { ascending: true });
    if (mErr) throw mErr;

    // Trae todos los ingresos de tipo cuota mensual (los que tienen miembro_id y no están vinculados a inscripciones)
    const { data: ingresos } = await supabase
      .from('ingreso')
      .select('id, miembro_id, monto, fecha, estado, descripcion, creacion, inscripcion_id')
      .not('miembro_id', 'is', null)
      .order('fecha', { ascending: true });

    // Obtener todo el historial de configuraciones ordenadas por creación ASC
    const { data: configs } = await supabase
      .from('configuracion_cuotas')
      .select('*')
      .order('creacion', { ascending: true });

    // Usar una lista por defecto si está vacía
    const configsList = configs && configs.length > 0 ? configs : [
      {
        creacion: new Date(0).toISOString(),
        frecuencia: 'mes',
        monto_cuota: 150,
        pausado: false,
        dias_pausados: 0,
      }
    ];

    // La última configuración activa (para indicar pausa global en el retorno)
    const configUltima = configsList[configsList.length - 1];

    // Avanzar el cursor según la frecuencia
    const avanzarCursor = (date, freq) => {
      const d = new Date(date);
      if (freq === '3_minutos') {
        d.setMinutes(d.getMinutes() + 3);
      } else if (freq === '1_dia') {
        d.setDate(d.getDate() + 1);
      } else if (freq === '2_dias') {
        d.setDate(d.getDate() + 2);
      } else if (freq === '3_dias') {
        d.setDate(d.getDate() + 3);
      } else if (freq === 'semana') {
        d.setDate(d.getDate() + 7);
      } else if (freq === 'trimestre') {
        d.setMonth(d.getMonth() + 3);
      } else {
        // default: mes
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    };

    return (miembros || []).map(m => {
      // 1. Determinar el límite superior temporal para la generación de cuotas
      let limiteHoy = new Date();
      if (m.estado === 'inactivo') {
        limiteHoy = m.fecha_pausa ? new Date(m.fecha_pausa) : new Date(m.creacion);
      }

      // 2. Ajustar la fecha de inicio del cronograma sumando los días que estuvo inactivo en el pasado
      const fechaInicio = new Date(m.creacion);
      const totalDiasPausados = Number(m.dias_pausados || 0);
      if (totalDiasPausados > 0) {
        fechaInicio.setDate(fechaInicio.getDate() + totalDiasPausados);
      }

      const pagosRealizados = (ingresos || []).filter(i => i.miembro_id === m.id && !i.inscripcion_id);

      const cronograma = [];
      let cursor = new Date(fechaInicio);
      let fechaProximaCuota;

      // Encontrar el índice de la configuración activa al momento de registrarse el socio
      let activeConfigIdx = 0;
      for (let i = 0; i < configsList.length; i++) {
        if (new Date(configsList[i].creacion) <= fechaInicio) {
          activeConfigIdx = i;
        }
      }

      // Algoritmo de recorrido de línea de tiempo con carry-over exacto
      while (true) {
        const currentConfig = configsList[activeConfigIdx];
        const nextConfig = configsList[activeConfigIdx + 1];
        
        const T_change = nextConfig ? new Date(nextConfig.creacion) : new Date(8640000000000000); // fin de los tiempos
        const T_quota = avanzarCursor(cursor, currentConfig.frecuencia);

        if (T_quota <= T_change) {
          // El vencimiento ocurre bajo la configuración activa actual
          if (T_quota <= limiteHoy) {
            const fechaCuota = new Date(T_quota);
            const diasPausa = Number(currentConfig.dias_pausados || 0);
            if (diasPausa > 0) {
              fechaCuota.setTime(fechaCuota.getTime() + (diasPausa * 24 * 60 * 60 * 1000));
            }

            // Formatear llave descriptiva del periodo
            let mesKey;
            const freq = currentConfig.frecuencia;
            if (freq === '3_minutos') {
              mesKey = `Min ${T_quota.toLocaleDateString('es-ES')} ${T_quota.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}`;
            } else if (freq === '1_dia' || freq === '2_dias' || freq === '3_dias') {
              mesKey = `Día ${T_quota.toLocaleDateString('es-ES')}`;
            } else if (freq === 'semana') {
              mesKey = `Sem ${T_quota.toLocaleDateString('es-ES')}`;
            } else if (freq === 'trimestre') {
              const t = Math.floor(T_quota.getMonth() / 3) + 1;
              mesKey = `T${t}-${T_quota.getFullYear()}`;
            } else {
              mesKey = `${T_quota.getFullYear()}-${String(T_quota.getMonth() + 1).padStart(2, '0')}`;
            }

            cronograma.push({
              mes: mesKey,
              fechaGeneracion: cursor.toISOString(),
              fechaVencimiento: T_quota.toISOString(),
              fechaVencimientoAjustada: fechaCuota.toISOString(),
              pagado: false,
              ingreso_id: null,
              monto_pagado: null,
              fecha_pago: null,
              monto_esperado: currentConfig.monto_cuota || 150,
            });

            cursor = T_quota;
          } else {
            // El vencimiento programado excede el presente o la fecha de pausa
            const fechaCuotaFutura = new Date(T_quota);
            const diasPausa = Number(currentConfig.dias_pausados || 0);
            if (diasPausa > 0) {
              fechaCuotaFutura.setTime(fechaCuotaFutura.getTime() + (diasPausa * 24 * 60 * 60 * 1000));
            }
            fechaProximaCuota = fechaCuotaFutura.toISOString();
            break;
          }
        } else {
          // La configuración cambió antes de cumplirse el vencimiento. Carry-over.
          activeConfigIdx += 1;
        }
      }

      // Ordenar pagos realizados cronológicamente
      const pagosOrdenados = [...pagosRealizados].sort((a, b) => {
        const da = new Date(a.fecha || a.creacion);
        const db = new Date(b.fecha || b.creacion);
        return da - db;
      });

      // Mapear pagos de forma estrictamente secuencial al cronograma
      cronograma.forEach((c, idx) => {
        const pagoEncontrado = pagosOrdenados[idx];
        if (pagoEncontrado) {
          c.pagado = true;
          c.ingreso_id = pagoEncontrado.id;
          c.monto_pagado = pagoEncontrado.monto;
          c.fecha_pago = pagoEncontrado.fecha || pagoEncontrado.creacion;
        }
      });

      const mesesDeuda = cronograma.filter(c => !c.pagado).length;
      const mesesPagados = cronograma.filter(c => c.pagado).length;
      const proximaPendiente = cronograma.find(c => !c.pagado);

      return {
        miembro: m,
        cronograma,
        mesesDeuda,
        mesesPagados,
        proximaPendiente,
        fechaProximaCuota,
        pausado: configUltima?.pausado || false,
        fechaPausa: configUltima?.fecha_pausa || null,
      };
    });
  },

  _syncInProgressKeys: new Set(),

  sincronizarNotificacionesDeuda: async (historial, config) => {
    try {
      const { data: notifs } = await supabase
        .from('notificacion')
        .select('miembro_id, titulo')
        .ilike('titulo', 'Pago pendiente:%');

      const { brevoService } = await import('../../../services/brevo.js');
      const montoCuota = config?.monto_cuota || 150;

      for (const { miembro, proximaPendiente } of historial) {
        if (!proximaPendiente) continue;

        const tituloEsperado = `Pago pendiente: ${proximaPendiente.mes}`;
        const syncKey = `${miembro.id}-${tituloEsperado}`;

        if (finanzasApi._syncInProgressKeys.has(syncKey)) continue;

        const yaNotificada = (notifs || []).some(n => n.miembro_id === miembro.id && n.titulo === tituloEsperado);

        if (!yaNotificada) {
          finanzasApi._syncInProgressKeys.add(syncKey);
          // Generar la notificacion en DB y enviar Email de forma silenciosa
          await brevoService.notificarPagoPendiente({
            email: miembro.correoElectronico || 'no-reply@control.com',
            nombre: `${miembro.nombre} ${miembro.apellidoPaterno}`,
            monto: montoCuota,
            fechaLimite: proximaPendiente.fechaVencimientoAjustada,
            diasRetraso: 0,
            miembroId: miembro.id,
            periodoKey: proximaPendiente.mes
          });
        }
      }
    } catch (err) {
      console.error('[finanzasApi] Error sincronizando notificaciones:', err);
    }
  },

  obtenerConfiguracionCuotas: async () => {
    const { data, error } = await supabase
      .from('configuracion_cuotas')
      .select('*')
      .order('creacion', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.warn('[Config Cuotas]', error.message);
    return data || { pausado: false, fecha_pausa: null, dias_pausados: 0 };
  },

  togglePausaCuotas: async (pausar, configActual) => {
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
      monto_cuota: configActual?.monto_cuota || 150,
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
    // Para conservar el historial e inmutabilidad, siempre insertamos un registro nuevo
    // en lugar de actualizar el ID existente.
    const cleanPayload = { ...payload };
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
      const { data, error } = await executeSave(cleanPayload);
      if (error) throw error;
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

  registrarEgreso: async (egreso) => {
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
  },

  obtenerEgresos: async () => {
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
  },

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
    const { data, error } = await supabase
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
        )
      `)
      .order('fecha_inscripcion', { ascending: false });

    if (error) throw error;

    // Filtrar para que solo muestre las inscripciones en actividades con costo > 0
    return (data || [])
      .filter(i => i.actividad && Number(i.actividad.costo) > 0)
      .map(i => ({
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
        actividad_tipo: i.actividad?.tipo_actividad?.nombre || 'General'
      }));
  }
};
