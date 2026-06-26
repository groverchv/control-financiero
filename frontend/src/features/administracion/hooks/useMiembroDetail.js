import { useState, useCallback } from 'react';
import { administracionApi } from '../api';
import { finanzasApi } from '../../finanzas/api';
import { supabase } from '../../../services/supabase';

/**
 * Hook para gestionar la carga de datos del detalle de un miembro.
 * Centraliza la lógica de fetching de inscripciones, notificaciones, CV, cuotas y estado de cuenta.
 * 
 * Pilar: Mantenibilidad — extraído de GestionMiembrosPage (50+ líneas de fetch paralelo).
 */
export const useMiembroDetail = () => {
  const [detailModal, setDetailModal] = useState({ 
    open: false, 
    miembro: null, 
    inscripciones: [], 
    notificaciones: [], 
    cvUrl: null, 
    loading: false, 
    tab: 'inscripciones',
    cronograma: [],
    inscripcionesCuenta: []
  });

  const handleOpenDetail = useCallback(async (miembro) => {
    setDetailModal({ 
      open: true, 
      miembro, 
      inscripciones: [], 
      notificaciones: [], 
      cvUrl: null, 
      loading: true, 
      tab: 'inscripciones',
      cronograma: [],
      inscripcionesCuenta: []
    });
    try {
      const [inscripciones, notificaciones, cvUrl, historialCuotas, { data: inscripcionesCuenta }] = await Promise.all([
        administracionApi.obtenerInscripcionesMiembro(miembro.id),
        administracionApi.obtenerNotificacionesMiembro(miembro.id),
        administracionApi.obtenerDocumentoMiembro(miembro.id),
        finanzasApi.obtenerHistorialCuotasMiembro(),
        supabase
          .from('inscripcion')
          .select(`
            id,
            estado,
            fecha_inscripcion,
            actividad:actividad_id(
              id, titulo, costo, fecha, hora, modalidad,
              tipo_actividad:tipo_actividad_id(nombre)
            ),
            ingreso(monto)
          `)
          .eq('miembro_id', miembro.id)
          .order('fecha_inscripcion', { ascending: false })
      ]);

      const miRegistroCuotas = historialCuotas.find(h => h.miembro?.id === miembro.id);
      const cronograma = miRegistroCuotas ? miRegistroCuotas.cronograma : [];

      setDetailModal(prev => ({ 
        ...prev, 
        inscripciones, 
        notificaciones, 
        cvUrl, 
        cronograma,
        inscripcionesCuenta: inscripcionesCuenta || [],
        loading: false 
      }));
    } catch (err) {
      console.error('Error cargando detalle:', err);
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  }, []);

  return {
    detailModal,
    setDetailModal,
    handleOpenDetail
  };
};
