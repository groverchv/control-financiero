import { supabase, supabaseAdmin } from '../../../services/supabase';

export const administracionApi = {
  obtenerMiembros: async () => {
    const { data, error } = await supabase
      .from('miembros')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  crearMiembro: async (miembro) => {
    if (!supabaseAdmin) {
      throw new Error('No se ha configurado la clave de administrador (Service Role Key)');
    }

    // 1. Crear usuario en Auth (esto disparará el trigger que lo inserta en 'miembros')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: miembro.email,
      password: miembro.password || 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: miembro.nombre,
        rol: miembro.rol
      }
    });

    if (authError) throw authError;

    // 2. Si se pasó teléfono, actualizamos la tabla miembros (porque el trigger no mapea teléfono por defecto)
    if (miembro.telefono) {
      await supabaseAdmin
        .from('miembros')
        .update({ telefono: miembro.telefono })
        .eq('id', authData.user.id);
    }

    // 3. Obtener el registro final de la tabla 'miembros' para devolverlo a la UI
    const { data, error } = await supabase
      .from('miembros')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (error) throw error;
    return data;
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

  eliminarMiembro: async (id) => {
    if (!supabaseAdmin) {
      throw new Error('No se ha configurado la clave de administrador (Service Role Key)');
    }
    
    // Eliminar de Auth (el trigger o cascada debería limpiar 'miembros' si está configurado, 
    // pero por si acaso Supabase maneja la integridad referencial)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    return true;
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
  obtenerKpis: async () => {
    const { data, error } = await supabase.from('miembros').select('estado');
    if (error) throw error;
    
    const miembros = data || [];
    const totalMiembros = miembros.length;
    const miembrosActivos = miembros.filter(m => m.estado === 'activo').length;
    const miembrosInactivos = totalMiembros - miembrosActivos;
    const tasaRetention = totalMiembros ? Math.round((miembrosActivos / totalMiembros) * 100) : 0;
    
    return {
      totalMiembros,
      miembrosActivos,
      miembrosInactivos,
      tasaRetention
    };
  },
};
