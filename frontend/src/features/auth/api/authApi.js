import { supabase } from '../../../services/supabase';
import { apiCache } from '../../../utils/apiCache';

export const authApi = {
  login: async (email, password) => {
    // Limpiar cualquier caché residual de una sesión previa antes de iniciar sesión
    apiCache.clearAll();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { data, error };

    // Obtener el rol y estado real de la tabla miembro
    const { data: profile } = await supabase
      .from('miembro')
      .select('rol, nombre, estado')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      if (profile.estado === 'inactivo') {
        // Cerrar sesión inmediatamente en Supabase Auth
        await supabase.auth.signOut();
        apiCache.clearAll();
        return {
          data: null,
          error: { message: 'Esta cuenta se encuentra inactiva y no tiene permiso para iniciar sesión. Por favor, contacte al administrador.' }
        };
      }
      // Inyectamos el rol real en el objeto de usuario para que la redirección sea precisa
      data.user.role_from_db = profile.rol;
    }

    return { data, error };
  },

  logout: async () => {
    apiCache.clearAll();
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

  /**
   * Envía un enlace de restablecimiento de contraseña al correo del usuario.
   * Supabase genera un token seguro y redirige a /reset-password.
   */
  resetPassword: async (email) => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { data, error };
  },

  /**
   * Actualiza la contraseña del usuario autenticado (post-recovery).
   * Solo funciona cuando el usuario tiene una sesión activa por token de recuperación.
   */
  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },
};
