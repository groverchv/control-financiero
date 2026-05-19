import { useState, useEffect } from 'react';
import { Calculator, Calendar, Landmark, Save, Trash2, Plus, Info, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { patrimonioApi } from '../api';
import { useActivos } from '../hooks';
import { Button, Input, Select, Spinner, Modal } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { useAuthStore } from '../../../store/authStore';

export const PlanAmortizacionPage = () => {
  const { activos, loading: loadingActivos } = useActivos();
  const { user } = useAuthStore();
  const [selectedActivoId, setSelectedActivoId] = useState('');
  const [numCuotas, setNumCuotas] = useState(12);
  const [frecuencia, setFrecuencia] = useState('mensual');
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [planesExistentes, setPlanesExistentes] = useState([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [configuracion, setConfiguracion] = useState(null);
  const [diasRecordatorio, setDiasRecordatorio] = useState(5);
  const [savingConfig, setSavingConfig] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await patrimonioApi.obtenerTodosPlanesAmortizacion();
        setPlanesExistentes(data.map(p => p.activoId));
        
        const configData = await patrimonioApi.obtenerConfiguracion();
        if (configData) {
          setConfiguracion(configData);
          setDiasRecordatorio(configData.dias_recordatorio_activos || 5);
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    if (!configuracion) return;
    setSavingConfig(true);
    try {
      await patrimonioApi.actualizarConfiguracion({
        id: configuracion.id,
        dias_recordatorio_activos: diasRecordatorio
      });
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Configuración guardada!',
        details: 'Los días de recordatorio de vencimiento de amortizaciones han sido actualizados con éxito.'
      });
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error de configuración',
        details: err instanceof Error ? err.message : 'No se pudo guardar la configuración de notificaciones en la base de datos.'
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const activoSeleccionado = activos.find(a => a.id === selectedActivoId);

  const generarPlan = () => {
    if (!activoSeleccionado || numCuotas <= 0) return;

    const montoTotal = activoSeleccionado.costo_total;
    const montoCuota = montoTotal / numCuotas;
    const nuevoPlan = [];
    let fechaActual = new Date();

    for (let i = 1; i <= numCuotas; i++) {
      if (frecuencia === 'mensual') {
        fechaActual.setMonth(fechaActual.getMonth() + 1);
      } else if (frecuencia === 'trimestral') {
        fechaActual.setMonth(fechaActual.getMonth() + 3);
      } else if (frecuencia === 'anual') {
        fechaActual.setFullYear(fechaActual.getFullYear() + 1);
      }

      nuevoPlan.push({
        numero: i,
        fechaVencimiento: new Date(fechaActual).toISOString().split('T')[0],
        monto: montoCuota,
        estado: 'pendiente'
      });
    }
    setPlan(nuevoPlan);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await patrimonioApi.guardarPlanAmortizacion(selectedActivoId, plan);
      setPlanesExistentes(prev => [...prev, selectedActivoId]);
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Plan de amortización guardado!',
        details: 'El cronograma de pagos amortizados ha sido registrado correctamente y se generarán notificaciones según vencimiento.'
      });
      setPlan([]);
      setSelectedActivoId('');
      setConfirmModalOpen(false);
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al guardar plan',
        details: err instanceof Error ? err.message : 'No se pudo registrar el plan de amortización del activo.'
      });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'numero', label: 'Cuota #' },
    { key: 'fechaVencimiento', label: 'Vencimiento' },
    { 
      key: 'monto', 
      label: 'Monto',
      render: (val) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val)
    },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (val) => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
          {val}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Plan de Amortización</h1>
        <p className="text-sm text-slate-500">Generación y seguimiento de cronogramas de pago para activos.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel de Configuración */}
        <section className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Configurar Plan</h2>
            </div>

            <div className="space-y-4">
              <Select
                label="Seleccionar Activo"
                value={selectedActivoId}
                onChange={(e) => setSelectedActivoId(e.target.value)}
                required
              >
                <option value="">Seleccione un activo...</option>
                {activos.filter(a => a.estado !== 'pagado' && !planesExistentes.includes(a.id)).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} - {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(a.costo_total)}</option>
                ))}
              </Select>

              {activoSeleccionado && (
                <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900">Información del Activo</p>
                      <p className="text-blue-700">Costo Total: {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(activoSeleccionado.costo_total)}</p>
                      <p className="text-blue-700">Saldo Pendiente: {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(activoSeleccionado.saldo_pendiente)}</p>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Número de Cuotas"
                type="number"
                value={numCuotas}
                onChange={(e) => setNumCuotas(parseInt(e.target.value) || 0)}
                min="1"
              />

              <Select
                label="Frecuencia de Pago"
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value)}
              >
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </Select>

              <Button 
                className="w-full mt-4" 
                onClick={generarPlan}
                disabled={!selectedActivoId || numCuotas <= 0}
              >
                Generar Cronograma
              </Button>
            </div>
          </div>
        </section>

        {/* Visualización del Plan */}
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Cronograma de Pagos</h2>
              </div>
              
              {plan.length > 0 && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setConfirmModalOpen(true)} 
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : <Save className="h-4 w-4 mr-2" />}
                  Confirmar y Guardar
                </Button>
              )}
            </div>

            {plan.length > 0 ? (
              <div className="overflow-hidden">
                <Table columns={columns} rows={plan} />
                
                <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Resumen del Plan</p>
                    <p className="text-sm text-slate-700">Se generarán {numCuotas} cuotas de {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(activoSeleccionado?.costo_total / numCuotas)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total a Amortizar</p>
                    <p className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(activoSeleccionado?.costo_total)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <Landmark className="h-16 w-16 mb-4 opacity-20" />
                <p>Seleccione un activo y configure las cuotas para ver el plan.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Configuración de Recordatorios</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">Configura con cuántos días de anticipación el sistema enviará recordatorios para los pagos o egresos de activos con plan de amortización.</p>
        <div className="flex flex-col sm:flex-row items-end gap-4 max-w-lg">
          <div className="flex-1 w-full">
            <Input
              label="Días de anticipación"
              type="number"
              min="1"
              max="30"
              value={diasRecordatorio}
              onChange={(e) => setDiasRecordatorio(parseInt(e.target.value) || 1)}
            />
          </div>
          <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full sm:w-auto">
            {savingConfig ? <Spinner size="sm" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      <Modal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Confirmar Plan de Amortización">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Está seguro de generar este plan de amortización con <strong>{numCuotas}</strong> cuotas para el activo <strong>{activoSeleccionado?.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Confirmar Generación'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Operación Exitosa" : "Error en Operación"} 
        width="max-w-md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {resultModal.type === 'success' ? (
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          ) : (
            <div className="rounded-full bg-rose-100 p-3 text-rose-600">
              <AlertCircle className="h-12 w-12" />
            </div>
          )}
          <h4 className={`text-lg font-bold ${resultModal.type === 'success' ? 'text-slate-900' : 'text-rose-900'}`}>
            {resultModal.text}
          </h4>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {resultModal.details}
          </p>
          <div className="pt-2 w-full">
            <Button 
              className="w-full" 
              variant={resultModal.type === 'success' ? 'primary' : 'danger'}
              onClick={() => setResultModal(prev => ({ ...prev, open: false }))}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
