import { supabase } from '../../../services/supabase';
import { withCache, apiCache } from '../../../utils/apiCache';

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

    try {
      // Registrar en la tabla archivo si hay imagen
      if (activo.imagen_url && activoRegistrado) {
        const { error: archError } = await supabase.from('archivo').insert([{
          activo_id: activoRegistrado.id,
          miembro_id: activo.miembro_id,
          url: activo.imagen_url,
          tipo: 'imagen_activo'
        }]);
        if (archError) throw archError;
      }
    } catch (transactionError) {
      console.error('[registrarActivo] Falla en registro secundario de imagen en BD. Ejecutando Rollback...', transactionError);
      if (activoRegistrado) {
        await supabase.from('activos').delete().eq('id', activoRegistrado.id);
      }
      throw transactionError;
    }

    // R15: Recargar el objeto completo (con tipo e imagen) para actualizar la UI sin F5
    const { data: fullAsset, error: fetchError } = await supabase
      .from('activos')
      .select('*, tipo_activo(nombre), archivo(url)')
      .eq('id', activoRegistrado.id)
      .single();

    if (fetchError) {
        return activoRegistrado;
    }

    apiCache.invalidate('patrimonio');
    return { 
      ...fullAsset, 
      imagen_url: fullAsset.archivo?.[0]?.url || null
    };
  },

  actualizarActivo: async (id, activo) => {
    // eslint-disable-next-line no-unused-vars
    const { imagen_url, ...activoData } = activo;
    const { data, error } = await supabase
      .from('activos')
      .update(activoData)
      .eq('id', id)
      .select();

    if (error) throw error;
    const activoActualizado = data?.[0];

    if (activo.imagen_url && activoActualizado) {
      await supabase.from('archivo').delete().eq('activo_id', id).eq('tipo', 'imagen_activo');
      await supabase.from('archivo').insert([{
        activo_id: id,
        miembro_id: activo.miembro_id,
        url: activo.imagen_url,
        tipo: 'imagen_activo'
      }]);
    }

    const { data: fullAsset, error: fetchError } = await supabase
      .from('activos')
      .select('*, tipo_activo(nombre), archivo(url)')
      .eq('id', id)
      .single();

    if (fetchError) {
        return activoActualizado;
    }

    apiCache.invalidate('patrimonio');
    return { 
      ...fullAsset, 
      imagen_url: fullAsset.archivo?.[0]?.url || null
    };
  },

  eliminarActivo: async (id) => {
    await supabase.from('archivo').delete().eq('activo_id', id);
    await supabase.from('plan_amortizacion').delete().eq('activo_id', id);
    
    const { error } = await supabase
      .from('activos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    apiCache.invalidate('patrimonio');
    return true;
  },

  obtenerActivos: (() => {
    const cachedFn = withCache('patrimonio:activos', async () => {
      const { data, error } = await supabase
        .from('activos')
        .select('*, tipo_activo(nombre), archivo(url)')
        .order('creacion', { ascending: false }); // R19: Orden descendente

      if (error) throw error;
      return (data || []).map(activo => ({
        ...activo,
        imagen_url: activo.archivo?.[0]?.url || null
      }));
    });
    return async (...args) => {
      return await cachedFn(...args);
    };
  })(),


  // NOTA: La tabla 'adquisiciones' no existe en el esquema de BD.
  // Si se requiere en el futuro, crear la tabla primero en setup.sql.
  registrarAdquisicion: async () => {
    throw new Error('[patrimonioApi] La tabla adquisiciones no existe en la base de datos. Registre el gasto como un egreso vinculado al activo.');
  },
  obtenerAdquisiciones: async () => {
    console.warn('[patrimonioApi] obtenerAdquisiciones: tabla adquisiciones no existe. Retornando array vacío.');
    return [];
  },


  obtenerAmortizacion: async (activoId) => {
    const { data, error } = await supabase
      .from('plan_amortizacion')
      .select('*')
      .eq('activo_id', activoId); // snake_case

    if (error) throw error;
    return data || [];
  },
  obtenerTodosPlanesAmortizacion: async () => {
    const { data, error } = await supabase
      .from('plan_amortizacion')
      .select('activo_id'); // snake_case

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
    await supabase.from('plan_amortizacion').delete().eq('activo_id', activoId); // snake_case

    // Insertar nuevo plan
    const { data, error } = await supabase
      .from('plan_amortizacion')
      .insert(plan.map(p => ({
        activo_id: activoId,              // snake_case (era activoId)
        numero: p.numero,
        fecha_vencimiento: p.fechaVencimiento || p.fecha_vencimiento, // acepta ambos formatos del frontend
        monto: p.monto,
        estado: 'pendiente'
      })))
      .select();

    if (error) throw error;
    return data;
  },

  _syncAmortizacionKeys: new Set(),

  sincronizarNotificacionesAmortizacion: async (userId) => {
    try {
      if (!userId) return;

      const { data: config } = await supabase.from('configuracion_cuotas').select('dias_recordatorio_activos').limit(1).maybeSingle();
      const diasAviso = config?.dias_recordatorio_activos || 5;

      const { data: planes } = await supabase.from('plan_amortizacion').select('*').eq('estado', 'pendiente');
      if (!planes || planes.length === 0) return;

      const { data: activos } = await supabase.from('activos').select('id, nombre');
      const { data: notifs } = await supabase.from('notificacion').select('titulo').eq('miembro_id', userId).ilike('titulo', 'Recordatorio de Amortizacion:%');

      const hoy = new Date();

      for (const p of planes) {
        const fechaVenc = new Date((p.fecha_vencimiento || p.fechaVencimiento) + 'T00:00:00'); // compatibilidad
        const diffDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

        if (diffDias <= diasAviso) {
          const activoNombre = activos?.find(a => a.id === (p.activo_id || p.activoId))?.nombre || 'Activo';
          const tituloEsperado = `Recordatorio de Amortizacion: ${activoNombre} - Cuota ${p.numero}`;
          const syncKey = `${userId}-${tituloEsperado}`;

          if (patrimonioApi._syncAmortizacionKeys.has(syncKey)) continue;

          const yaNotificada = (notifs || []).some(n => n.titulo === tituloEsperado);

          if (!yaNotificada) {
            patrimonioApi._syncAmortizacionKeys.add(syncKey);
            const montoFormateado = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(p.monto);
            const descAmort = `Cuota ${p.numero} de "${activoNombre}" (${montoFormateado}) vence el ${fechaVenc.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}.${diffDias < 0 ? ' VENCIDA.' : ''}`;
            await supabase.from('notificacion').insert([{
              miembro_id: userId,
              titulo: tituloEsperado,
              descripcion: descAmort,
              estado: 'pendiente'
            }]);
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
      .upsert({ ...cleanConfig, singleton_guard: true }, { onConflict: 'singleton_guard' })
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
