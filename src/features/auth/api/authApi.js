import { supabase } from '../../../services/supabase';

export const authApi = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
