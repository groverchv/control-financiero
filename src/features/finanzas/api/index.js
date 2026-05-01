import { supabase } from '../../../services/supabase';

export const finanzasApi = {
  registrarPago: async (cuota) => {
    const { data, error } = await supabase
      .from('cuotas')
      .insert([cuota])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  obtenerCuotas: async (miembroId) => {
    let query = supabase.from('cuotas').select('*');

    if (miembroId) {
      query = query.eq('miembroId', miembroId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  registrarEgreso: async (egreso) => {
    const { data, error } = await supabase
      .from('egresos')
      .insert([egreso])
      .select();

    if (error) throw error;
    return data?.[0];
  },
  obtenerEgresos: async () => {
    const { data, error } = await supabase
      .from('egresos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },
  registrarIngresoExtra: async (ingreso) => {
    const { data, error } = await supabase
      .from('ingresos_extras')
      .insert([ingreso])
      .select();

    if (error) throw error;
    return data?.[0];
  },
  obtenerIngresosExtras: async () => {
    const { data, error } = await supabase
      .from('ingresos_extras')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },
  obtenerReportes: async () => {
    const { data, error } = await supabase
      .from('reportes_financieros')
      .select('*')
      .order('periodo', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  obtenerFlujoCaja: async () => {
    // 1. Obtener suma de cuotas (solo pagadas)
    const { data: cuotas } = await supabase.from('cuotas').select('monto').eq('estado', 'pagada');
    const totalCuotas = (cuotas || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // 2. Obtener suma de ingresos extras
    const { data: extras } = await supabase.from('ingresos_extras').select('monto');
    const totalExtras = (extras || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // 3. Obtener suma de egresos
    const { data: egresos } = await supabase.from('egresos').select('monto');
    const egresosTotales = (egresos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

    const ingresosTotales = totalCuotas + totalExtras;
    const saldoNeto = ingresosTotales - egresosTotales;

    return { ingresosTotales, egresosTotales, saldoNeto };
  },
};
