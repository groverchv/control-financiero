import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { setUser, setLoading, user } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const fetchUserData = async (sessionUser) => {
      // Intentar obtener los datos reales de la tabla miembro (rol, nombre, etc)
      const { data: miembro, error } = await supabase
        .from('miembro')
        .select('rol, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico"')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error al obtener perfil del miembro:', error);
      }

      // El rol real viene de la DB, priorizándolo sobre la metadata
      const realRole = miembro?.rol || sessionUser.user_metadata?.rol || 'socio';
      const fullName = miembro 
        ? `${miembro.nombre} ${miembro.apellidoPaterno || ''} ${miembro.apellidoMaterno || ''}`.trim()
        : (sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0]);

      // 2. Obtener foto de perfil si existe
      const { data: archivos } = await supabase
        .from('archivo')
        .select('url')
        .eq('miembro_id', sessionUser.id)
        .eq('tipo', 'foto')
        .eq('estado', 'activo')
        .maybeSingle();

      setUser({
        id: sessionUser.id,
        email: miembro?.correoElectronico || sessionUser.email || '',
        nombre: fullName,
        rol: realRole,
        foto: archivos?.url || null,
        created_at: sessionUser.created_at || '',
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserData(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [setUser, setLoading]);

  return { user, isAuthenticated: !!user };
};
