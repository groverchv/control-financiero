import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { setUser, setLoading, user } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const fetchUserData = async (sessionUser) => {
      const role = sessionUser.user_metadata?.rol || 'socio';
      
      // Intentar obtener el nombre de la tabla miembros
      const { data: miembro } = await supabase
        .from('miembros')
        .select('nombre')
        .eq('id', sessionUser.id)
        .single();

      setUser({
        id: sessionUser.id,
        email: sessionUser.email || '',
        nombre: miembro?.nombre || sessionUser.email?.split('@')[0],
        rol: role,
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
  }, [setUser]);

  return { user, isAuthenticated: !!user };
};
