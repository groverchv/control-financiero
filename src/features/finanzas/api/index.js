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
    return { ingresosTotales: 0, egresosTotales: 0, saldoNeto: 0 };
  },
};
