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

    const fetchUserData = async (sessionUser) => {
      // Intentar obtener los datos reales de la tabla miembro (rol, nombre, etc)
      const { data: miembro } = await supabase
        .from('miembro')
        .select('rol, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", estado')
        .eq('id', sessionUser.id)
        .maybeSingle();



      // Si el miembro está inactivo, bloquear el acceso y cerrar la sesión
      if (miembro && miembro.estado === 'inactivo') {
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
