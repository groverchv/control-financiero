import { useState } from 'react';
import { ClipboardList, ArrowDownCircle, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { finanzasApi } from '../api';
import { useEgresos } from '../hooks';
import { useAuthStore } from '../../../store/authStore';
import { Button, Input, Select, Spinner, ExportButtons, Modal } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { cloudinaryService } from '../../../services/cloudinary';
import { useEffect } from 'react';

export const RegistroEgresosPage = () => {
  const { egresos, loading, error, setEgresos } = useEgresos();
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    concepto: '',
    monto: '',
    fecha: '',
    tipo_egreso_id: '',
    activo_id: '',
    descripcion: '',
    comprobante: null,
  });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tiposEgreso, setTiposEgreso] = useState([]);
  const [activos, setActivos] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [detalleModal, setDetalleModal] = useState({ open: false, egreso: null });
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const totalPages = Math.ceil(egresos.length / ITEMS_PER_PAGE);
  const paginatedEgresos = egresos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataTipos, dataActivos] = await Promise.all([
          finanzasApi.obtenerTiposEgreso(),
          finanzasApi.obtenerActivos()
        ]);
        setTiposEgreso(dataTipos);
        setActivos(dataActivos);
      } catch (err) {
        console.error('Error cargando datos previos:', err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, files } = event.target;
    if (type === 'file') {
      setForm((prev) => ({ ...prev, [name]: files[0] || null }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage(null);
    
    // Validar sobrepago si hay activo seleccionado
    if (form.activo_id) {
      const activo = activos.find(a => a.id === form.activo_id);
      if (activo) {
        if (Number(form.monto) > activo.saldo_pendiente) {
          setMessage({
            type: 'error',
            text: `El monto excede el saldo pendiente del activo. Solo se debe Bs ${activo.saldo_pendiente}.`
          });
          return;
        }
      }
    }
    
    setConfirmModal(true);
  };

  const executeSubmit = async () => {
    setConfirmModal(false);
    setSubmitting(true);

    try {
      let comprobanteUrl = null;
      if (form.comprobante) {
        comprobanteUrl = await cloudinaryService.uploadFile(form.comprobante, 'egresos');
      }

      await finanzasApi.registrarEgreso({
        registradoPor: user?.id,
        tipo_egreso_id: form.tipo_egreso_id,
        activo_id: form.activo_id,
        concepto: form.concepto,
        descripcion: form.descripcion,
        monto: Number(form.monto),
        fecha: form.fecha,
        comprobanteUrl,
      });
      
      const updatedEgresos = await finanzasApi.obtenerEgresos();
      if (setEgresos) setEgresos(updatedEgresos);

      setMessage({ type: 'success', text: 'Egreso registrado correctamente.' });
      setForm({ concepto: '', monto: '', fecha: '', tipo_egreso_id: '', activo_id: '', descripcion: '', comprobante: null });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar el egreso.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registro de egresos</h1>
          <p className="text-sm text-slate-500">Controla los egresos operativos de la institucion.</p>
        </div>
        <ExportButtons 
          data={egresos.map(e => ({ 
            Concepto: e.concepto, 
            'Registrado Por': e.registrado_por_nombre || 'Sistema',
            Monto: e.monto, 
            Fecha: e.fecha, 
            Categoria: e.categoria 
          }))} 
          filename="historial_egresos" 
          title="Reporte de Egresos Institucionales" 
        />
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form className="rounded-md bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Nuevo egreso</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              id="concepto"
              name="concepto"
              label="Concepto"
              value={form.concepto}
              onChange={handleChange}
              placeholder="Mantenimiento, servicios, etc."
              required
            />
            <Input
              id="monto"
              name="monto"
              label="Monto"
              type="number"
              value={form.monto}
              onChange={handleChange}
              required
            />
            <Input
              id="fecha"
              name="fecha"
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              required
            />
            <Select
              id="tipo_egreso_id"
              name="tipo_egreso_id"
              label="Tipo de Egreso"
              value={form.tipo_egreso_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione un tipo...</option>
              {tiposEgreso.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </Select>
              <Select
                id="activo_id"
                name="activo_id"
                label="Activo Asociado (Opcional)"
                value={form.activo_id}
                onChange={handleChange}
              >
                <option value="">Ninguno...</option>
                {activos.filter(a => a.saldo_pendiente > 0).map((activo) => (
                  <option key={activo.id} value={activo.id}>{activo.nombre} (Debe Bs {activo.saldo_pendiente})</option>
                ))}
              </Select>
            <Input
              id="descripcion"
              name="descripcion"
              label="Detalle de egreso (Opcional)"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Descripción adicional..."
            />
            <div>
              <label htmlFor="comprobante" className="block text-sm font-medium text-slate-700 mb-1">
                Comprobante / Evidencia (Opcional)
              </label>
              <input
                id="comprobante"
                name="comprobante"
                type="file"
                accept=".pdf,image/*"
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
          {message ? (
            <Toast
              title={message.type === 'error' ? 'Error' : 'Exito'}
              message={message.text}
              variant={message.type === 'error' ? 'error' : 'success'}
            />
          ) : null}
          <Button type="submit" disabled={submitting} className="mt-5">
            Registrar egreso
          </Button>
        </form>

        <div className="rounded-md bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Egresos recientes</h2>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Cargando egresos...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : egresos.length === 0 ? (
              <p className="text-sm text-slate-500">No hay egresos registrados.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Monto</th>
                        <th className="px-4 py-3">Fecha Registro</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedEgresos.map((egreso) => (
                        <tr key={egreso.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{egreso.concepto}</td>
                          <td className="px-4 py-3">{egreso.categoria}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">Bs. {egreso.monto}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {egreso.creacion 
                              ? new Date(egreso.creacion).toLocaleString('es-ES', { 
                                  day: '2-digit', month: '2-digit', year: 'numeric', 
                                  hour: '2-digit', minute: '2-digit', hour12: true 
                                }) 
                              : new Date(egreso.fecha).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setDetalleModal({ open: true, egreso })}
                              className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, egresos.length)} de {egresos.length} registros
                    </p>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        className="h-8 w-8 p-0" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-8 w-8 p-0" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Confirmar registro de egreso">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de registrar este egreso por <strong>Bs. {form.monto}</strong> bajo el concepto de "{form.concepto}"?
            {form.activo_id && " Esto reducirá el saldo pendiente del activo asociado."}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setConfirmModal(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={executeSubmit} disabled={submitting}>Confirmar Egreso</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={detalleModal.open} onClose={() => setDetalleModal({ open: false, egreso: null })} title="Detalle del Egreso">
        {detalleModal.egreso && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Concepto</p>
                <p className="font-semibold text-slate-900">{detalleModal.egreso.concepto}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Monto Egresado</p>
                <p className="font-semibold text-slate-900">Bs. {detalleModal.egreso.monto}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Tipo de Egreso</p>
                <p className="text-slate-700">{detalleModal.egreso.categoria}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Fecha Lógica</p>
                <p className="text-slate-700">{new Date(detalleModal.egreso.fecha).toLocaleDateString('es-ES')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Fecha de Registro</p>
                <p className="text-slate-700">
                  {detalleModal.egreso.creacion 
                    ? new Date(detalleModal.egreso.creacion).toLocaleString('es-ES', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', hour12: true 
                      }) 
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Registrado por</p>
                <p className="text-slate-700">{detalleModal.egreso.registrado_por_nombre}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-medium mb-1">Descripción</p>
                <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200">{detalleModal.egreso.descripcion || 'Sin descripción adicional'}</p>
              </div>
              {detalleModal.egreso.comprobanteUrl && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium mb-2">Comprobante Adjunto</p>
                  <img 
                    src={detalleModal.egreso.comprobanteUrl} 
                    alt="Comprobante" 
                    className="h-32 w-auto object-cover rounded border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setImageModal({ open: true, url: detalleModal.egreso.comprobanteUrl })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={imageModal.open} onClose={() => setImageModal({ open: false, url: null })} title="Comprobante">
        <div className="flex justify-center bg-slate-50 rounded-lg p-2">
          {imageModal.url && (
            <img 
              src={imageModal.url} 
              alt="Comprobante Full" 
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
