import { supabase } from '../../../services/supabase';

export const patrimonioApi = {
  registrarActivo: async (activo) => {
    const { data, error } = await supabase
      .from('activos')
      .insert([activo])
      .select();

    if (error) throw error;
    const activoRegistrado = data?.[0];

    // Registrar en la tabla archivo si hay imagen
    if (activo.imagen_url && activoRegistrado) {
      await supabase.from('archivo').insert([{
        activo_id: activoRegistrado.id,
        miembro_id: activo.miembro_id,
        url: activo.imagen_url,
        tipo: 'imagen_activo'
      }]);
    }

    return activoRegistrado;
  },

  obtenerActivos: async () => {
    const { data, error } = await supabase
      .from('activos')
      .select('*, tipo_activo(nombre)');

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
};
