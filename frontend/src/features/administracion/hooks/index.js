import { useState, useEffect } from 'react';
import { administracionApi } from '../api';

export const useMiembros = () => {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMiembros = async () => {
    setLoading(true);
    setError(null);
    try {
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
  }, []);

  return { miembros, loading, error, setMiembros, refetch: fetchMiembros };
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
