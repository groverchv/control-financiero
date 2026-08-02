import { useState, useEffect } from 'react';
import { patrimonioApi } from '../api';
import { supabase } from '../../../services/supabase';

export const useActivos = () => {
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patrimonioApi.obtenerActivos();
      setActivos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    const channel = supabase
      .channel('realtime-use-activos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activos' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { activos, loading, error, setActivos, refetch: load };
};

export const useAdquisiciones = () => {
  const [adquisiciones, setAdquisiciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await patrimonioApi.obtenerAdquisiciones();
        setAdquisiciones(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { adquisiciones, loading, error };
};

