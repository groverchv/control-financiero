import { supabase } from '../../../services/supabase';
import { brevoService } from '../../../services/brevo';

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
      await supabase.from('archivo').insert([{
        ingreso_id: pagoRegistrado.id,
        url: pago.comprobanteUrl,
        tipo: 'comprobante_ingreso'
      }]);
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

    return pagoRegistrado;
  },

  obtenerCuotas: async (miembroId) => {
    let query = supabase.from('ingreso').select(`
      *,
      tipo:tipo_ingreso(nombre),
      registrador:miembro!registrado_por(nombre, apellidoPaterno),
      socio:miembro!miembro_id(nombre, apellidoPaterno),
      archivos:archivo(url)
    `).order('creacion', { ascending: false });

    if (miembroId) {
      query = query.eq('miembro_id', miembroId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data?.map(d => ({ 
      ...d, 
      miembroId: d.miembro_id,
      socio_nombre: d.socio ? `${d.socio.nombre} ${d.socio.apellidoPaterno || ''}`.trim() : 'Sin Asignar',
      tipo_ingreso_nombre: d.tipo?.nombre || 'Ingreso',
      registrado_por_nombre: d.registrador ? `${d.registrador.nombre} ${d.registrador.apellidoPaterno || ''}`.trim() : 'Sistema',
      comprobanteUrl: d.archivos && d.archivos.length > 0 ? d.archivos[0].url : null
    })) || [];
  },

  registrarEgreso: async (egreso) => {
    const { data, error } = await supabase
      .from('egreso')
      .insert([{
        miembro_id: egreso.registradoPor || egreso.miembro_id || null,
        tipo_egreso_id: egreso.tipo_egreso_id || null,
        activo_id: egreso.activo_id || null,
        monto: egreso.monto,
        fecha: egreso.fecha,
        concepto: egreso.concepto,
        descripcion: egreso.descripcion || null,
      }])
      .select();

    if (error) throw error;
    const egresoRegistrado = data?.[0];

    // Registrar archivo si se proporcionó una URL de comprobante
    if (egreso.comprobanteUrl && egresoRegistrado) {
      await supabase.from('archivo').insert([{
        egreso_id: egresoRegistrado.id,
        url: egreso.comprobanteUrl,
        tipo: 'comprobante_egreso'
      }]);
    }

    return egresoRegistrado;
  },

  obtenerEgresos: async () => {
    const { data, error } = await supabase
      .from('egreso')
      .select(`
        *,
        tipo:tipo_egreso(nombre),
        registrador:miembro!miembro_id(nombre, apellidoPaterno),
        archivos:archivo(url)
      `)
      .order('creacion', { ascending: false });

    if (error) throw error;
    return data?.map(d => ({
      ...d,
      categoria: d.tipo?.nombre || 'Egreso',
      registrado_por_nombre: d.registrador ? `${d.registrador.nombre} ${d.registrador.apellidoPaterno || ''}`.trim() : 'Sistema',
      comprobanteUrl: d.archivos && d.archivos.length > 0 ? d.archivos[0].url : null
    })) || [];
  },

  registrarIngresoExtra: async (ingreso) => {
    const { data, error } = await supabase
      .from('ingreso')
      .insert([{
        miembro_id: ingreso.registradoPor || ingreso.miembro_id,
        monto: ingreso.monto,
        fecha: ingreso.fecha,
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
};
