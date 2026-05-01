import { supabase } from '../../../services/supabase';

export const academicoApi = {
  crearEvento: async (evento) => {
    const { data, error } = await supabase
      .from('eventos')
      .insert([evento])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  obtenerEventos: async () => {
    const { data, error } = await supabase
      .from('eventos')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  actualizarEvento: async (id, updates) => {
    const { data, error } = await supabase
      .from('eventos')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  eliminarEvento: async (id) => {
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
  crearActividad: async (actividad) => {
    const { data, error } = await supabase
      .from('actividades_academicas')
      .insert([actividad])
      .select();

    if (error) throw error;
    return data?.[0];
  },
  obtenerActividades: async () => {
    const { data, error } = await supabase
      .from('actividades_academicas')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },
  asignarJurado: async (asignacion) => {
    const { data, error } = await supabase
      .from('asignaciones_jurado')
      .insert([asignacion])
      .select();

    if (error) throw error;
    return data?.[0];
  },
  obtenerAsignaciones: async () => {
    const { data, error } = await supabase
      .from('asignaciones_jurado')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  buscarTalento: async (criterio) => {
    const { data, error } = await supabase
      .from('talentos')
      .select('*')
      .ilike('especialidad', `%${criterio}%`);

    if (error) throw error;
    return data || [];
  },
};
