import { useState, useEffect } from 'react';
import { academicoApi } from '../api';

export const useActividades = () => {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await academicoApi.obtenerActividades();
        setActividades(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { actividades, loading, error, setActividades };
};

export const useTiposActividad = () => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await academicoApi.obtenerTiposActividad();
        setTipos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { tipos, loading, error, setTipos };
};

export const useTalentos = (criterio) => {
  const [talentos, setTalentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!criterio) return;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    setLoading(true);
    academicoApi.buscarTalento(criterio)
      .then(setTalentos)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setLoading(false));
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
