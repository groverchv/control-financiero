import { useState, useEffect } from 'react';

/**
 * Overlay premium de carga transaccional universal.
 * Muestra un modal centrado con spinner, indicador numérico de porcentaje (%) y barra de progreso
 * en tiempo real para TODAS las acciones del sistema (Registro, Actualización, Eliminación, Copias de seguridad, etc.).
 *
 * @param {boolean} open      - Controla la visibilidad del overlay.
 * @param {string}  text      - Texto descriptivo de la acción en curso.
 * @param {number}  progress  - Porcentaje de avance explícito opcional (0 a 100).
 */
export const LoadingOverlay = ({ open, text, progress }) => {
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    setSimulatedProgress(open ? 8 : 0);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    // Si la acción nos proporciona un porcentaje de avance explícito (0-100), no simulamos
    if (typeof progress === 'number' && !isNaN(progress)) {
      return;
    }

    // Iniciar avance fluido y continuo de 0% a 95% para cualquier acción transaccional
    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 95) return prev;
        if (prev < 30) return prev + 14;
        if (prev < 65) return prev + 9;
        if (prev < 85) return prev + 4;
        return prev + 1;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [open, progress]);

  if (!open) return null;

  const t = (text || '').toLowerCase();

  const titulo =
    t.includes('eliminar') || t.includes('cancelar') || t.includes('inactivar')
      ? 'Procesando Eliminación'
      : t.includes('actualizar') || t.includes('guardar') || t.includes('modificar') || t.includes('pausar') || t.includes('reanudar') || t.includes('estado')
        ? 'Procesando Actualización'
        : t.includes('registrar') || t.includes('crear')
          ? 'Procesando Registro'
          : t.includes('respaldo') || t.includes('copia') || t.includes('restaurar')
            ? 'Procesando Copia de Seguridad'
            : 'Procesando Solicitud';

  const hasExplicitProgress = typeof progress === 'number' && !isNaN(progress);
  const currentProgress = hasExplicitProgress
    ? Math.min(100, Math.max(0, Math.round(progress)))
    : simulatedProgress;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in duration-300">
        <div className="relative flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border-4 border-emerald-50 border-t-emerald-600 animate-spin" />
          <span className="absolute text-sm font-black text-emerald-600 font-mono tracking-tighter">
            {currentProgress}%
          </span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{titulo}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {text || 'Estamos procesando su solicitud de forma segura.'}
          </p>
        </div>
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-0.5">
            <span>Completado</span>
            <span className="text-emerald-600 font-mono font-bold">{currentProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest animate-pulse">
          Por favor, no cierre esta ventana
        </p>
      </div>
    </div>
  );
};
