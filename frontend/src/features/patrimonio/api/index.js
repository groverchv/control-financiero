import { supabase } from '../../../services/supabase';
import { blockchainService } from '../../../services/blockchain';

export const patrimonioApi = {
  registrarActivo: async (activo) => {
    // eslint-disable-next-line no-unused-vars
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
    // R12: Devolvemos el TxID para confirmar veracidad
    const txId = await blockchainService.sellarYActualizar('activo', activoRegistrado, activo.miembro_id || 'sistema');

    // R15: Recargar el objeto completo (con tipo e imagen) para actualizar la UI sin F5
    const { data: fullAsset, error: fetchError } = await supabase
      .from('activos')
      .select('*, tipo_activo(nombre), archivo(url)')
      .eq('id', activoRegistrado.id)
      .single();

    if (fetchError) {
        return { ...activoRegistrado, blockchain_tx_id: txId };
    }

    return { 
      ...fullAsset, 
      blockchain_tx_id: txId,
      imagen_url: fullAsset.archivo?.[0]?.url || null
    };
  },

  obtenerActivos: async () => {
    const { data, error } = await supabase
      .from('activos')
      .select('*, tipo_activo(nombre), archivo(url)')
      .order('creacion', { ascending: false }); // R19: Orden descendente

    if (error) throw error;
    return (data || []).map(activo => ({
      ...activo,
      imagen_url: activo.archivo?.[0]?.url || null
    }));
  },

  sellarActivo: async (id, idUsuario) => {
    const { data: activo, error } = await supabase
      .from('activos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    const txId = await blockchainService.sellarYActualizar('activo', activo, idUsuario || 'sistema');
    if (!txId) throw new Error('No se pudo generar el sello en el servidor Blockchain. Verifique la conexión.');
    
    return txId;
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
  actualizarTipoActivo: async (id, tipo) => {
    const { data, error } = await supabase
      .from('tipo_activo')
      .update(tipo)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },
  eliminarTipoActivo: async (id) => {
    const { error } = await supabase
      .from('tipo_activo')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
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
        const fechaVenc = new Date(p.fechaVencimiento + 'T00:00:00');
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
      .order('creacion', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },
  
  actualizarConfiguracion: async (configuracion) => {
    const cleanConfig = { ...configuracion };
    delete cleanConfig.id;
    delete cleanConfig.creacion;
    delete cleanConfig.actualizacion;

    const { data, error } = await supabase
      .from('configuracion_cuotas')
      .insert([cleanConfig])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  verificarTipoActivoEnUso: async (tipoId) => {
    const { count, error } = await supabase
      .from('activos')
      .select('id', { count: 'exact', head: true })
      .eq('tipo_activo_id', tipoId);
    if (error) throw error;
    return count > 0;
  }
};
