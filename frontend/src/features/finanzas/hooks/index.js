import { useState, useEffect } from 'react';
import { finanzasApi } from '../api';
import { supabase } from '../../../services/supabase';

export const usePagos = (miembroId) => {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      if (force) {
        const { apiCache } = await import('../../../utils/apiCache');
        apiCache.invalidate('finanzas:cuotas');
      }
      const data = await finanzasApi.obtenerCuotas(miembroId);
      setCuotas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [miembroId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: recargar cuando cambien registros de ingreso (ej. reembolso_pendiente)
  useEffect(() => {
    const channel = supabase
      .channel('realtime-use-pagos')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ingreso' },
        () => {
          // Invalidar caché y recargar
          import('../../../utils/apiCache').then(({ apiCache }) => {
            apiCache.invalidate('finanzas:cuotas');
          });
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { cuotas, loading, error, setCuotas, refetch: () => load(true) };
};

export const useFlujoCaja = () => {
  const [flujo, setFlujo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    finanzasApi.obtenerFlujoCaja()
      .then(setFlujo)
      .finally(() => setLoading(false));
  }, []);

  return { flujo, loading };
};

export const useEgresos = () => {
  const [egresos, setEgresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      if (force) {
        const { apiCache } = await import('../../../utils/apiCache');
        apiCache.invalidate('finanzas:egresos');
      }
      const data = await finanzasApi.obtenerEgresos();
      setEgresos(data);
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
      .channel('realtime-use-egresos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'egreso' }, () => {
        import('../../../utils/apiCache').then(({ apiCache }) => apiCache.invalidate('finanzas:egresos'));
        load(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { egresos, loading, error, setEgresos, refetch: () => load(true) };
};

export const useIngresosExtras = () => {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const data = await finanzasApi.obtenerIngresosExtras();
      setIngresos(data);
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
      .channel('realtime-use-ingresos-extras')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingreso' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { ingresos, loading, error, refetch: load };
};

export const useReportesFinancieros = () => {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await finanzasApi.obtenerReportes();
        setReportes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { reportes, loading, error };
};
