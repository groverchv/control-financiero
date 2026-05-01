import { supabase } from '../../../services/supabase';

export const administracionApi = {
  obtenerMiembros: async () => {
    const { data, error } = await supabase
      .from('miembros')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  crearMiembro: async (miembro) => {
    const { data, error } = await supabase
      .from('miembros')
      .insert([miembro])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  actualizarMiembro: async (id, updates) => {
    const { data, error } = await supabase
      .from('miembros')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  inactivarMiembro: async (id) => {
    return administracionApi.actualizarMiembro(id, { estado: 'inactivo' });
  },
  obtenerAlertas: async () => {
    const { data, error } = await supabase
      .from('alertas')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
