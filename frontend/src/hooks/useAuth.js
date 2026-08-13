import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-toastify';
import OneSignal from 'react-onesignal';

// Wrappers seguros para evitar que cualquier fallo del script de OneSignal afecte a la app
// Este flag asegura que solo llamamos login/logout DESPUÉS de que init() haya resuelto con éxito
let oneSignalReady = false;

const safeOneSignalLogin = async (userId) => {
  if (!oneSignalReady) return;
  try {
    // Primero cerramos cualquier sesión previa para evitar el error 409 (Conflict)
    // que ocurre cuando el externalId ya está vinculado a otro dispositivo/sesión
    await OneSignal.logout().catch(() => {});
    await OneSignal.login(userId);
  } catch (err) {
    // El 409 es un estado esperado y no afecta la funcionalidad de la app
    console.warn('OneSignal: login omitido o fallido de forma silenciosa:', err ? (err.message || err) : 'Error desconocido');
  }
};

const safeOneSignalLogout = async () => {
  if (!oneSignalReady) return;
  try {
    await OneSignal.logout();
  } catch (err) {
    console.warn('OneSignal: logout omitido o fallido de forma silenciosa:', err ? (err.message || err) : 'Error desconocido');
  }
};


export const useAuth = () => {
  const { setUser, setLoading, user, logout } = useAuthStore();

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (appId) {
      OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
      })
        .then(() => {
          oneSignalReady = true;
        })
        .catch(err => {
          console.warn('OneSignal: no pudo inicializarse (dominio no autorizado o error de red):', err.message || err);
        });
    }
  }, []);


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

    const fetchUserData = async (sessionUser) => {
      let miembro = null;
      let archivos = null;

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
        console.error('[useAuth] Error al consultar Supabase:', err);
      }

      // Si el miembro está inactivo, bloquear el acceso y cerrar la sesión
      if (miembro && miembro.estado === 'inactivo') {
        try {
          await supabase.auth.signOut();
          safeOneSignalLogout();
        } catch (err) {
          console.warn('[useAuth] Error al cerrar sesión de miembro inactivo:', err.message);
        }
        setUser(null);
        setLoading(false);
        return;
      }

      // El rol real viene de la DB, priorizándolo sobre la metadata
      const realRole = miembro?.rol || sessionUser.user_metadata?.rol || 'socio';
      const fullName = miembro 
        ? `${miembro.nombre} ${miembro.apellidoPaterno || ''} ${miembro.apellidoMaterno || ''}`.trim()
        : (sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0]);

      // Si el rol de metadata no coincide con el de la DB, actualizamos el user metadata en Supabase Auth
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

      setUser(userData);
      setLoading(false);

      // Vincular sesión en OneSignal
      safeOneSignalLogin(sessionUser.id);

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
        } catch (err) {
          console.warn('[useAuth] Error al verificar/crear notificación de bienvenida:', err.message);
        }
      }, 1500);
    };

    // Intentar obtener la sesión de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      // No auto-login si el usuario está en la página de restablecimiento de contraseña
      const isResetPage = window.location.pathname === '/reset-password';
      if (session?.user && !isResetPage) {
        fetchUserData(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[useAuth] getSession() falló:', err);
      setUser(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const isResetPage = window.location.pathname === '/reset-password';

        // No procesar sesiones de recuperación de contraseña como login normal.
        // Ni siquiera si el evento es SIGNED_IN pero estamos en la página de reset.
        if (_event === 'PASSWORD_RECOVERY' || (session?.user && isResetPage)) {
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user && !isResetPage) {
          fetchUserData(session.user);
        } else {
          setUser(null);
          setLoading(false);
          safeOneSignalLogout();
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
          if (window.isRestoring) return;
          const { titulo, descripcion } = payload.new;

          // Evitar doble notificación: mostrar Toast en pantalla
          // O notificación nativa de escritorio, pero NO ambas.
          // - Si la pestaña está en primer plano → Toast (más integrado con la UI)
          // - Si la pestaña está en segundo plano → Push nativa del OS
          const tabVisible = document.visibilityState === 'visible';

          if (tabVisible) {
            toast.info(`${titulo}\n${descripcion}`, {
              position: 'top-right',
              autoClose: 6000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              style: { whiteSpace: 'pre-line' },
            });
          } else if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(titulo, {
                body: descripcion,
                icon: user.foto || '/favicon.svg',
              });
            } catch (err) {
              console.warn('[useAuth] Error al mostrar notificación nativa de escritorio:', err.message);
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
