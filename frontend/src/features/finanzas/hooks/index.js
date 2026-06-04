import { useState, useEffect } from 'react';
import { finanzasApi } from '../api';

export const usePagos = (miembroId) => {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await finanzasApi.obtenerCuotas(miembroId);
      setCuotas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [miembroId]);

  return { cuotas, loading, error, setCuotas, refetch: load };
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await finanzasApi.obtenerEgresos();
      setEgresos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { egresos, loading, error, setEgresos, refetch: load };
};

export const useIngresosExtras = () => {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

    load();
  }, []);

  return { ingresos, loading, error };
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
