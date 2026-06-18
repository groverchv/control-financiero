-- ==========================================================
-- MIGRACIÓN: PRESERVAR ESTADO 'cancelado' EN TRIGGER DE ACTIVIDAD
-- ==========================================================
-- Problema: Al actualizar cualquier campo de la tabla `actividad`
-- (ej. publicado), el trigger BEFORE UPDATE sobreescribía el estado
-- 'cancelado' con 'programado'/'en_curso'/'finalizado' basado en la fecha.
-- Esto causaba que el botón de cancelar reapareciera al recargar la página.
--
-- Solución: El trigger ahora respeta el estado 'cancelado' y lo preserva.
-- ==========================================================

CREATE OR REPLACE FUNCTION public.update_academico_status()
RETURNS trigger AS $$
BEGIN
  -- Si la actividad fue cancelada manualmente, preservar ese estado
  IF NEW.estado = 'cancelado' THEN
    RETURN NEW;
  END IF;

  IF NEW.fecha < CURRENT_DATE THEN
    NEW.estado := 'finalizado';
  ELSIF NEW.fecha = CURRENT_DATE THEN
    NEW.estado := 'en_curso';
  ELSE
    NEW.estado := 'programado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notificar recarga de esquema
NOTIFY pgrst, 'reload schema';

-- Verificar que el trigger existe (si no, recrearlo)
DROP TRIGGER IF EXISTS tr_update_actividad_status ON public.actividad;
CREATE TRIGGER tr_update_actividad_status
  BEFORE INSERT OR UPDATE ON public.actividad
  FOR EACH ROW EXECUTE FUNCTION public.update_academico_status();
