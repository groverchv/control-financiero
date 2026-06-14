import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-toastify';

export const useAuth = () => {
  const { setUser, setLoading, user, logout } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;

    // R6: Suscripción en tiempo real para detectar si el usuario fue deshabilitado
    const channel = supabase
      .channel(`user-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'miembro',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          if (payload.new && payload.new.estado !== 'activo') {
            await supabase.auth.signOut();
            logout();
            window.location.href = '/login?msg=cuenta_deshabilitada';
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, logout]);

  useEffect(() => {
    setLoading(true);

    /**
     * Carga el usuario desde caché local de localStorage
     */
    const loadFromLocalCache = () => {
      try {
        const cachedUserStr = localStorage.getItem('control-financiero-auth-user');
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          if (cachedUser && cachedUser.id) {
            setUser(cachedUser);
            return true;
          }
        }
      } catch (e) {
        console.error('[useAuth] Error al parsear cached user:', e);
      }
      return false;
    };

    const fetchUserData = async (sessionUser) => {
      let miembro = null;
      let archivos = null;
      let offlineFallback = false;

      try {
        const { data } = await supabase
          .from('miembro')
          .select('rol, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", estado')
          .eq('id', sessionUser.id)
          .maybeSingle();
        miembro = data;

        // Obtener foto de perfil si existe
        const { data: archs } = await supabase
          .from('archivo')
          .select('url')
          .eq('miembro_id', sessionUser.id)
          .eq('tipo', 'foto')
          .eq('estado', 'activo')
          .maybeSingle();
        archivos = archs;
      } catch (err) {
        console.warn('[useAuth] Error al consultar Supabase (posiblemente offline). Usando fallback de caché local:', err);
        offlineFallback = true;
      }

      // Si el miembro está inactivo, bloquear el acceso y cerrar la sesión
      if (miembro && miembro.estado === 'inactivo') {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignorar error al intentar cerrar sesión en Supabase
        }
        localStorage.removeItem('control-financiero-auth-user');
        setUser(null);
        setLoading(false);
        return;
      }

      if (offlineFallback) {
        // Intentar recuperar el perfil de la caché local primero
        const cachedUserStr = localStorage.getItem('control-financiero-auth-user');
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            if (cachedUser.id === sessionUser.id) {
              setUser(cachedUser);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error al parsear cached user:', e);
          }
        }
        // Si no hay caché, usamos lo que Supabase Auth tenga en metadata
        const fallbackRole = sessionUser.user_metadata?.rol || 'socio';
        const fallbackName = sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || '';
        const fallbackUser = {
          id: sessionUser.id,
          email: sessionUser.email || '',
          nombre: fallbackName,
          rol: fallbackRole,
          foto: null,
          created_at: sessionUser.created_at || '',
        };
        setUser(fallbackUser);
        setLoading(false);
        return;
      }

      // El rol real viene de la DB, priorizándolo sobre la metadata
      const realRole = miembro?.rol || sessionUser.user_metadata?.rol || 'socio';
      const fullName = miembro 
        ? `${miembro.nombre} ${miembro.apellidoPaterno || ''} ${miembro.apellidoMaterno || ''}`.trim()
        : (sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0]);

      // Si estamos online y el rol de metadata no coincide con el de la DB, actualizamos el user metadata en Supabase Auth
      if (miembro && sessionUser.user_metadata?.rol !== realRole) {
        supabase.auth.updateUser({
          data: { rol: realRole }
        }).catch(e => console.warn('Error actualizando rol en metadata de Supabase Auth:', e));
      }

      const userData = {
        id: sessionUser.id,
        email: miembro?.correoElectronico || sessionUser.email || '',
        nombre: fullName,
        rol: realRole,
        foto: archivos?.url || null,
        created_at: sessionUser.created_at || '',
      };

      // Guardar en caché local para persistencia offline
      localStorage.setItem('control-financiero-auth-user', JSON.stringify(userData));

      setUser(userData);
      setLoading(false);

      // Validar si el usuario cuenta con la notificación de bienvenida
      setTimeout(async () => {
        try {
          const { data: hasWelcome } = await supabase
            .from('notificacion')
            .select('id')
            .eq('miembro_id', sessionUser.id)
            .eq('titulo', '¡Bienvenido!')
            .limit(1)
            .maybeSingle();

          if (!hasWelcome) {
            await supabase.from('notificacion').insert({
              miembro_id: sessionUser.id,
              titulo: '¡Bienvenido!',
              descripcion: 'Te damos la bienvenida.',
              estado: 'pendiente'
            });
          }
        } catch {
          // Error silenciado
        }
      }, 1500);
    };

    // Intentar obtener la sesión de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        // Sin sesión activa: si estamos offline, usar caché local. Si estamos online, borrar sesión.
        if (!navigator.onLine) {
          const loaded = loadFromLocalCache();
          if (!loaded) {
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    }).catch((err) => {
      console.warn('[useAuth] getSession() falló (posiblemente offline):', err);
      // Si falla getSession() completamente (error de red), recuperar de caché
      const loaded = loadFromLocalCache();
      if (!loaded) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserData(session.user);
        } else {
          // Si estamos offline, NO borramos al usuario local para no forzar logout
          if (!navigator.onLine) {
            // Solo garantizamos que loading sea false, el usuario en store ya está cargado
            setLoading(false);
            return;
          }
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [setUser, setLoading]);

  useEffect(() => {
    if (!user || !user.id) return;

    // Solicitar permiso de notificaciones de escritorio si está en default
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // R12: Auto-sellar registros pendientes cuando Fabric está en línea
    const autoSeal = async () => {
      try {
        const { blockchainService } = await import('../services/blockchain');
        const online = await blockchainService.healthCheck();
        if (online) {
          await blockchainService.sellarPendientes('ingreso');
          await blockchainService.sellarPendientes('egreso');
          await blockchainService.sellarPendientes('activo');
          await blockchainService.sellarPendientes('archivo');
          await blockchainService.sellarPendientes('actividad');
        }
      } catch {
        // Error silenciado
      }
    };
    
    autoSeal();

    // Suscribirse a inserciones de notificaciones en tiempo real para el usuario actual
    const channel = supabase
      .channel(`miembro-notificaciones-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacion',
          filter: `miembro_id=eq.${user.id}`,
        },
        (payload) => {
          const { titulo, descripcion } = payload.new;

          // 1. Mostrar Toast en pantalla
          toast.info(`${titulo}\n${descripcion}`, {
            position: 'top-right',
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            style: { whiteSpace: 'pre-line' },
          });

          // 2. Mostrar Notificación PUSH Nativa de Escritorio
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(titulo, {
                body: descripcion,
                icon: user.foto || '/favicon.svg',
              });
            } catch {
              // Error silenciado
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { user, isAuthenticated: !!user };
};
