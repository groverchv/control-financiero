import { useState, useEffect } from 'react';
import { academicoApi } from '../api';
import { supabase } from '../../../services/supabase';

export const useActividades = () => {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const data = await academicoApi.obtenerActividades();
      setActividades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-use-actividades')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'actividad' },
        async (payload) => {
          // Invalidar caché de academico al haber cualquier cambio en BD
          const { apiCache } = await import('../../../utils/apiCache');
          apiCache.invalidate('academico');

          if (payload.eventType === 'DELETE') {
            setActividades(prev => prev.filter(a => a.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            try {
              const updatedAct = await academicoApi.obtenerActividadPorId(payload.new.id);
              setActividades(prev => {
                const filtered = prev.filter(a => a.id !== updatedAct.id);
                // Ordenar por fecha descendente, idéntico al default de obtenerActividades
                const updatedList = [updatedAct, ...filtered];
                updatedList.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                return updatedList;
              });
            } catch (err) {
              console.error('Error actualizando actividad en hook useActividades:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { actividades, loading, error, setActividades, refetch };
};

export const useTiposActividad = () => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const data = await academicoApi.obtenerTiposActividad();
      setTipos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { tipos, loading, error, setTipos, refetch };
};

export const useTalentos = (criterio) => {
  const [talentos, setTalentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!criterio) return;

    let isMounted = true;
    const fetchTalentos = async () => {
      setLoading(true);
      try {
        const data = await academicoApi.buscarTalento(criterio);
        if (isMounted) {
          setTalentos(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTalentos();

    return () => {
      isMounted = false;
    };
  }, [criterio]);

  return { talentos, loading, error };
};

export const useAsignacionesJurado = () => {
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await academicoApi.obtenerAsignaciones();
        setAsignaciones(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { asignaciones, loading, error };
};
