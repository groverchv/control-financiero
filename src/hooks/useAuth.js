import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-toastify';

export const useAuth = () => {
  const { setUser, setLoading, user } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const fetchUserData = async (sessionUser) => {
      // Intentar obtener los datos reales de la tabla miembro (rol, nombre, etc)
      const { data: miembro, error } = await supabase
        .from('miembro')
        .select('rol, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", estado')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error al obtener perfil del miembro:', error);
      }

      // Si el miembro está inactivo, bloquear el acceso y cerrar la sesión
      if (miembro && miembro.estado === 'inactivo') {
        console.warn('Usuario inactivo detectado. Cerrando sesión...');
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
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

      // Validar si el usuario cuenta con la notificación de bienvenida
      setTimeout(async () => {
        try {
          const { data: hasWelcome } = await supabase
            .from('notificacion')
            .select('id')
            .eq('miembro_id', sessionUser.id)
            .eq('titulo', '¡Bienvenido a Control Financiero!')
            .limit(1)
            .maybeSingle();

          if (!hasWelcome) {
            await supabase.from('notificacion').insert({
              miembro_id: sessionUser.id,
              titulo: '¡Bienvenido a Control Financiero!',
              descripcion: 'Te damos la bienvenida al sistema de Control Financiero. Aquí podrás gestionar cuotas, ingresos, egresos, patrimonio y ver tu estado de cuenta en tiempo real.',
              estado: 'pendiente'
            });
          }
        } catch (err) {
          console.error('Error al validar o insertar notificación de bienvenida:', err);
        }
      }, 1500);
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
                icon: user.foto || '/favicon.ico',
              });
            } catch (err) {
              console.error('Error al disparar notificación push nativa:', err);
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
