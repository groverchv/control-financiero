import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button, Modal } from '../../../components/ui';

/**
 * Modal de confirmación de cambio de estado (activar/desactivar miembro).
 * Extraído de GestionMiembrosPage.jsx para mejorar mantenibilidad.
 */
export const StatusConfirmModal = ({
  isOpen,
  onClose,
  statusConfirmModal,
  setStatusConfirmModal,
  onConfirm,
  isSubmitting
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      id="status-confirm-modal"
      title={
        statusConfirmModal.nuevoEstado === 'inactivo' ? (
          <div className="flex items-center gap-2.5 text-red-600">
            <AlertTriangle className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>Desactivar Miembro</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-emerald-600">
            <CheckCircle2 className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>Reactivar Miembro</span>
          </div>
        )
      }
    >
      <div className="space-y-4 py-2">
        {statusConfirmModal.nuevoEstado === 'inactivo' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 bg-red-50/50 border border-red-100 rounded-xl text-red-800 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold mb-1">¡Advertencia Importante!</p>
                <p className="leading-relaxed">
                  ¿Estás seguro de cambiar el estado del miembro <strong>{statusConfirmModal.miembro?.nombre}</strong> a <strong>Inactivo</strong>?
                </p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Efectos en el sistema:</p>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                <li><strong>Acceso bloqueado:</strong> El miembro no podrá iniciar sesión en la plataforma.</li>
                <li><strong>Notificaciones pausadas:</strong> Se detendrá el envío de notificaciones y alertas automáticas.</li>
                <li><strong>Generación de cuotas congelada:</strong> El contador de tiempo para su próxima cuota se detendrá inmediatamente. No se generarán nuevas cuotas mientras esté inactivo.</li>
                <li><strong>Deudas pendientes:</strong> Las cuotas que ya están pendientes de pago <strong className="text-slate-800">NO se eliminarán ni se marcarán como pagadas</strong>, y seguirán registradas en su cuenta.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="leading-relaxed">
                  Confirmar reactivación para el miembro <strong>{statusConfirmModal.miembro?.nombre}</strong>. Se habilitará nuevamente su acceso a la plataforma.
                </p>
              </div>
            </div>

            <div className="border border-slate-200/80 rounded-xl p-4 bg-white space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configuración del Ciclo de Cuotas
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selecciona cómo deseas que el sistema gestione la generación de la próxima cuota de membresía:
              </p>
              
              <div className="space-y-2 pt-1">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${statusConfirmModal.reactivationMode === 'resume' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="reactivationMode" 
                    value="resume"
                    checked={statusConfirmModal.reactivationMode === 'resume'}
                    onChange={() => setStatusConfirmModal(prev => ({ ...prev, reactivationMode: 'resume' }))}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Reanudar desde donde se pausó</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Continúa el conteo del ciclo actual. Se sumará el tiempo restante que el usuario tenía acumulado antes de ser inactivado.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${statusConfirmModal.reactivationMode === 'reset' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="reactivationMode" 
                    value="reset"
                    checked={statusConfirmModal.reactivationMode === 'reset'}
                    onChange={() => setStatusConfirmModal(prev => ({ ...prev, reactivationMode: 'reset' }))}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Iniciar un nuevo ciclo completo desde cero</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Reinicia el contador de cuotas. El conteo comenzará desde cero a partir de hoy, otorgando un ciclo completo nuevo.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            variant={statusConfirmModal.nuevoEstado === 'inactivo' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : statusConfirmModal.nuevoEstado === 'inactivo' ? 'Confirmar Desactivación' : 'Confirmar Reactivación'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
