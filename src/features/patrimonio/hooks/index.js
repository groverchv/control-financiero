import { useState, useEffect } from 'react';
import { patrimonioApi } from '../api';

export const useActivos = () => {
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await patrimonioApi.obtenerActivos();
        setActivos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { activos, loading, error };
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

export const useAuditorias = () => {
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await patrimonioApi.obtenerAuditorias();
        setAuditorias(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { auditorias, loading, error };
};
