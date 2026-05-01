import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { setUser, setLoading, user } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.rol || 'socio';
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          rol: role,
          created_at: session.user.created_at || '',
        });
      } else {
        setUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const role = session.user.user_metadata?.rol || 'socio';
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            rol: role,
            created_at: session.user.created_at || '',
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [setUser]);

  return { user, isAuthenticated: !!user };
};
