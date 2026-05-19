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

    return pagoRegistrado;
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
    // Trae todos los miembros activos con su fecha de creación
    const { data: miembros, error: mErr } = await supabase
      .from('miembro')
      .select('id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, creacion')
      .neq('estado', 'inactivo')
      .order('creacion', { ascending: true });
    if (mErr) throw mErr;

    // Trae todos los ingresos de tipo cuota mensual (los que tienen miembro_id)
    const { data: ingresos } = await supabase
      .from('ingreso')
      .select('id, miembro_id, monto, fecha, estado, descripcion, creacion')
      .not('miembro_id', 'is', null)
      .order('fecha', { ascending: true });

    // Obtener configuracion de pausa global y frecuencia
    const config = await finanzasApi.obtenerConfiguracionCuotas();
    const frecuencia = config?.frecuencia || 'mes';

    const hoy = new Date();

    return (miembros || []).map(m => {
      const fechaInicio = new Date(m.creacion);
      const pagosRealizados = (ingresos || []).filter(i => i.miembro_id === m.id);

      // Generar cronograma según la frecuencia desde fechaInicio hasta hoy
      const cronograma = [];
      let cursor = new Date(fechaInicio);

      // Avanzar el cursor según la frecuencia
      const avanzarCursor = (date) => {
        const d = new Date(date);
        if (frecuencia === '3_minutos') {
          d.setMinutes(d.getMinutes() + 3);
        } else if (frecuencia === '1_dia') {
          d.setDate(d.getDate() + 1);
        } else if (frecuencia === '2_dias') {
          d.setDate(d.getDate() + 2);
        } else if (frecuencia === '3_dias') {
          d.setDate(d.getDate() + 3);
        } else if (frecuencia === 'semana') {
          d.setDate(d.getDate() + 7);
        } else if (frecuencia === 'trimestre') {
          d.setMonth(d.getMonth() + 3);
        } else {
          // default: mes
          d.setMonth(d.getMonth() + 1);
        }
        return d;
      };

      // Avanzar al primer vencimiento
      cursor = avanzarCursor(cursor);

      // Calcular offset de pausa si existe
      const diasPausa = config?.dias_pausados || 0;

      while (cursor <= hoy) {
        const fechaCuota = new Date(cursor);
        if (diasPausa > 0) {
          fechaCuota.setDate(fechaCuota.getDate() + diasPausa);
        }

        // Formatear llave descriptiva del periodo
        let mesKey;
        if (frecuencia === '3_minutos') {
          mesKey = `Min ${cursor.toLocaleDateString('es-ES')} ${cursor.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}`;
        } else if (frecuencia === '1_dia' || frecuencia === '2_dias' || frecuencia === '3_dias') {
          mesKey = `Día ${cursor.toLocaleDateString('es-ES')}`;
        } else if (frecuencia === 'semana') {
          mesKey = `Sem ${cursor.toLocaleDateString('es-ES')}`;
        } else if (frecuencia === 'trimestre') {
          const t = Math.floor(cursor.getMonth() / 3) + 1;
          mesKey = `T${t}-${cursor.getFullYear()}`;
        } else {
          mesKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        }

        cronograma.push({
          mes: mesKey,
          fechaVencimiento: new Date(cursor).toISOString().split('T')[0],
          fechaVencimientoAjustada: fechaCuota.toISOString().split('T')[0],
          pagado: false,
          ingreso_id: null,
          monto_pagado: null,
          fecha_pago: null,
        });

        cursor = avanzarCursor(cursor);
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
        pausado: config?.pausado || false,
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
          
          // Mostrar notificación Push web nativa si hay permisos
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nueva Deuda de Cuota', {
              body: `Se ha generado la cuota ${proximaPendiente.mes} (Bs. ${montoCuota}) para ${miembro.nombre} ${miembro.apellidoPaterno}.`,
            });
          }
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
      payload = { pausado: true, fecha_pausa: hoy, dias_pausados: configActual?.dias_pausados || 0 };
    } else {
      // Calcular días que estuvo pausado
      const diasAdicionales = configActual?.fecha_pausa
        ? Math.ceil((new Date() - new Date(configActual.fecha_pausa)) / (1000 * 60 * 60 * 24))
        : 0;
      payload = {
        pausado: false,
        fecha_pausa: null,
        dias_pausados: (configActual?.dias_pausados || 0) + diasAdicionales,
      };
    }

    // Upsert configuration
    const { data: existing } = await supabase
      .from('configuracion_cuotas')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('configuracion_cuotas')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('configuracion_cuotas')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  actualizarConfiguracionCuotas: async (payload) => {
    const { data: existing } = await supabase
      .from('configuracion_cuotas')
      .select('id')
      .limit(1)
      .maybeSingle();

    const executeSave = async (dataToSave) => {
      if (existing?.id) {
        return await supabase
          .from('configuracion_cuotas')
          .update(dataToSave)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        return await supabase
          .from('configuracion_cuotas')
          .insert([dataToSave])
          .select()
          .single();
      }
    };

    try {
      const { data, error } = await executeSave(payload);
      if (error) throw error;
      return data;
    } catch (err) {
      if (err.message?.includes('frecuencia') || err.message?.includes('monto_cuota') || err.code === '42703') {
        console.warn('[Supabase] Columnas nuevas no existen. Intentando guardar sin ellas.');
        const fallbackPayload = { ...payload };
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
    const { data, error } = await supabase
      .from('egreso')
      .insert([{
        miembro_id: egreso.registradoPor || egreso.miembro_id || null,
        tipo_egreso_id: egreso.tipo_egreso_id || null,
        activo_id: egreso.activo_id || null,
        monto: egreso.monto,
        fecha: egreso.fecha || new Date().toISOString().split('T')[0],
        concepto: egreso.concepto,
        descripcion: egreso.descripcion || null,
      }])
      .select();

    if (error) throw error;
    const egresoRegistrado = data?.[0];

    // Registrar archivo si se proporcionó una URL de comprobante
    if (egreso.comprobanteUrl && egresoRegistrado) {
      const { data: archData } = await supabase.from('archivo').insert([{
        egreso_id: egresoRegistrado.id,
        url: egreso.comprobanteUrl,
        tipo: 'comprobante_egreso'
      }]).select();

      // Sellar el archivo en blockchain
      if (archData?.[0]) {
        blockchainService.sellarYActualizar('archivo', archData[0], egreso.registradoPor || 'sistema');
      }
    }

    // Sellar el egreso en blockchain
    blockchainService.sellarYActualizar('egreso', egresoRegistrado, egreso.registradoPor || 'sistema');

    return egresoRegistrado;
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
  }
};
