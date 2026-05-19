import { supabase } from '../../../services/supabase';
import { blockchainService } from '../../../services/blockchain';

export const patrimonioApi = {
  registrarActivo: async (activo) => {
    const { imagen_url, ...activoData } = activo;
    const { data, error } = await supabase
      .from('activos')
      .insert([activoData])
      .select();

    if (error) throw error;
    const activoRegistrado = data?.[0];

    // Registrar en la tabla archivo si hay imagen
    if (activo.imagen_url && activoRegistrado) {
      const { data: archData } = await supabase.from('archivo').insert([{
        activo_id: activoRegistrado.id,
        miembro_id: activo.miembro_id,
        url: activo.imagen_url,
        tipo: 'imagen_activo'
      }]).select();

      // Sellar el archivo
      if (archData?.[0]) {
        blockchainService.sellarYActualizar('archivo', archData[0], activo.miembro_id || 'sistema');
      }
    }

    // Sellar el activo en blockchain
    blockchainService.sellarYActualizar('activo', activoRegistrado, activo.miembro_id || 'sistema');

    return activoRegistrado;
  },

  obtenerActivos: async () => {
    const { data, error } = await supabase
      .from('activos')
      .select('*, tipo_activo(nombre), archivo(url)');

    if (error) throw error;
    return (data || []).map(activo => ({
      ...activo,
      imagen_url: activo.archivo?.[0]?.url || null
    }));
  },
  registrarAdquisicion: async (adquisicion) => {
    const { data, error } = await supabase
      .from('adquisiciones')
      .insert([adquisicion])
      .select();

    if (error) throw error;
    return data?.[0];
  },
  obtenerAdquisiciones: async () => {
    const { data, error } = await supabase
      .from('adquisiciones')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },
  registrarAuditoria: async (auditoria) => {
    const { data, error } = await supabase
      .from('auditorias_blockchain')
      .insert([auditoria])
      .select();

    if (error) throw error;
    return data?.[0];
  },
  obtenerAuditorias: async () => {
    const { data, error } = await supabase
      .from('auditorias_blockchain')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  obtenerAmortizacion: async (activoId) => {
    const { data, error } = await supabase
      .from('plan_amortizacion')
      .select('*')
      .eq('activoId', activoId);

    if (error) throw error;
    return data || [];
  },
  obtenerTodosPlanesAmortizacion: async () => {
    const { data, error } = await supabase
      .from('plan_amortizacion')
      .select('activoId');

    if (error) throw error;
    return data || [];
  },
  obtenerTiposActivo: async () => {
    const { data, error } = await supabase
      .from('tipo_activo')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data || [];
  },
  crearTipoActivo: async (tipo) => {
    const { data, error } = await supabase
      .from('tipo_activo')
      .insert([tipo])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  sellarActivo: async (id, registradoPor) => {
    const { data, error } = await supabase.from('activos').select('*').eq('id', id).single();
    if (error) throw error;
    return await blockchainService.sellarYActualizar('activo', data, registradoPor);
  },
  
  guardarPlanAmortizacion: async (activoId, plan) => {
    // Eliminar plan anterior si existe
    await supabase.from('plan_amortizacion').delete().eq('activoId', activoId);
    
    // Insertar nuevo plan
    const { data, error } = await supabase
      .from('plan_amortizacion')
      .insert(plan.map(p => ({
        activoId,
        numero: p.numero,
        fechaVencimiento: p.fechaVencimiento,
        monto: p.monto,
        estado: 'pendiente'
      })))
      .select();

    if (error) throw error;
    return data;
  },

  _syncAmortizacionKeys: new Set(),

  sincronizarNotificacionesAmortizacion: async (userId, userEmail, userNombre) => {
    try {
      if (!userId) return;

      const { data: config } = await supabase.from('configuracion_cuotas').select('dias_recordatorio_activos').limit(1).maybeSingle();
      const diasAviso = config?.dias_recordatorio_activos || 5;

      const { data: planes } = await supabase.from('plan_amortizacion').select('*').eq('estado', 'pendiente');
      if (!planes || planes.length === 0) return;

      const { data: activos } = await supabase.from('activos').select('id, nombre');
      const { data: notifs } = await supabase.from('notificacion').select('titulo').eq('miembro_id', userId).ilike('titulo', 'Recordatorio de Amortización:%');

      const { brevoService } = await import('../../../services/brevo.js');
      const hoy = new Date();

      for (const p of planes) {
        const fechaVenc = new Date(p.fechaVencimiento);
        const diffDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

        if (diffDias <= diasAviso) {
          const activoNombre = activos?.find(a => a.id === p.activoId)?.nombre || 'Activo';
          const tituloEsperado = `Recordatorio de Amortización: ${activoNombre} - Cuota ${p.numero}`;
          const syncKey = `${userId}-${tituloEsperado}`;

          if (patrimonioApi._syncAmortizacionKeys.has(syncKey)) continue;

          const yaNotificada = (notifs || []).some(n => n.titulo === tituloEsperado);

          if (!yaNotificada) {
            patrimonioApi._syncAmortizacionKeys.add(syncKey);
            const montoFormateado = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(p.monto);
            
            await brevoService.enviarNotificacionGeneral({
              email: userEmail || 'admin@control.com',
              nombre: userNombre || 'Administrador',
              titulo: tituloEsperado,
              mensaje: `El pago de la cuota ${p.numero} por la amortización de "${activoNombre}" vence el ${fechaVenc.toLocaleDateString('es-ES')}. El monto a pagar es de ${montoFormateado}. Por favor, realice el egreso correspondiente para evitar deudas de la institución.`,
              tipo: diffDias < 0 ? 'error' : 'warning',
              miembroId: userId
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(tituloEsperado, {
                body: `Vencimiento: ${fechaVenc.toLocaleDateString('es-ES')} - Monto: ${montoFormateado}`,
                icon: '/vite.svg',
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[patrimonioApi] Error sincronizando notificaciones de amortización:', err);
    }
  },

  obtenerConfiguracion: async () => {
    const { data, error } = await supabase
      .from('configuracion_cuotas')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  actualizarConfiguracion: async (configuracion) => {
    const { data, error } = await supabase
      .from('configuracion_cuotas')
      .update(configuracion)
      .eq('id', configuracion.id)
      .select();

    if (error) throw error;
    return data?.[0];
  }
};
