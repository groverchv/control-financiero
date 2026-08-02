import { useState, useEffect } from 'react';
import { administracionApi } from '../api';
import { supabase } from '../../../services/supabase';
import { apiCache } from '../../../utils/apiCache';

export const useMiembros = () => {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMiembros = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      if (force) {
        apiCache.invalidate('obtenerMiembros');
      }
      const data = await administracionApi.obtenerMiembros();
      setMiembros(data);
    } catch (err) {
      setError(err?.message || String(err) || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMiembros();

    // Escuchar cambios en tiempo real
    const canal = supabase
      .channel('miembros-cambios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'miembro' },
        () => {
          apiCache.invalidate('obtenerMiembros');
          fetchMiembros(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  return { miembros, loading, error, setMiembros, refetch: () => fetchMiembros(true) };
};

export const useKpiData = () => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await administracionApi.obtenerKpis();
        setKpis(data);
      } catch (error) {
        console.error('Error cargando KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { kpis, loading };
};

export const useAlertas = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await administracionApi.obtenerAlertas();
        setAlertas(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { alertas, loading, error };
};
