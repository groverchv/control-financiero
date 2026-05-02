import { supabase } from '../../../services/supabase';

export const authApi = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { data, error };

    // Obtener el rol real de la tabla miembro
    const { data: profile } = await supabase
      .from('miembro')
      .select('rol, nombre')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      // Inyectamos el rol real en el objeto de usuario para que la redirección sea precisa
      data.user.role_from_db = profile.rol;
    }

    return { data, error };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  signup: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },
};
