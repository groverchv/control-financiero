import { Loader2 } from 'lucide-react';

/**
 * Overlay premium de carga transaccional.
 * Muestra un modal centrado con spinner, barra de progreso y mensaje
 * mientras se procesa una acción (registro, actualización, eliminación, etc.).
 *
 * @param {boolean} open  - Controla la visibilidad del overlay.
 * @param {string}  text  - Texto descriptivo de la acción en curso.
 */
export const LoadingOverlay = ({ open, text }) => {
  if (!open) return null;

  const t = (text || '').toLowerCase();

  const titulo =
    t.includes('eliminar') || t.includes('cancelar') || t.includes('inactivar')
      ? 'Procesando Eliminación'
      : t.includes('actualizar') || t.includes('guardar') || t.includes('modificar') || t.includes('pausar') || t.includes('reanudar') || t.includes('estado')
        ? 'Procesando Actualización'
        : t.includes('registrar') || t.includes('crear')
          ? 'Procesando Registro'
          : 'Procesando Solicitud';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in duration-300">
        <div className="relative flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin" />
          <Loader2 className="absolute h-10 w-10 text-blue-600 animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{titulo}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {text || 'Estamos procesando su solicitud de forma segura.'}
          </p>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest animate-pulse">Por favor, no cierre esta ventana</p>
      </div>
    </div>
  );
};
