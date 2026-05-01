import { supabase } from '../../../services/supabase';

export const patrimonioApi = {
  registrarActivo: async (activo) => {
    const { data, error } = await supabase
      .from('activos')
      .insert([activo])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  obtenerActivos: async () => {
    const { data, error } = await supabase
      .from('activos')
      .select('*');

    if (error) throw error;
    return data || [];
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
};
