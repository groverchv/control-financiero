import { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { finanzasApi } from '../api';
import { administracionApi } from '../../administracion/api';
import { usePagos } from '../hooks';
import { Button, Input, Select, Spinner, ExportButtons, Modal } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { cloudinaryService } from '../../../services/cloudinary';
import { useAuthStore } from '../../../store/authStore';

export const RegistroCuotasPage = () => {
  const { user } = useAuthStore();
  const { cuotas, loading, error, setCuotas } = usePagos();
  const [form, setForm] = useState({
    miembroBuscador: '',
    tipo_ingreso_id: '',
    monto: '',
    descripcion: '',
    fecha: '',
    estado: 'pagada',
    comprobante: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [tiposIngreso, setTiposIngreso] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [detalleModal, setDetalleModal] = useState({ open: false, cuota: null });
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const totalPages = Math.ceil(cuotas.length / ITEMS_PER_PAGE);
  const paginatedCuotas = cuotas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataMiembros, dataTipos] = await Promise.all([
          administracionApi.obtenerMiembros(),
          finanzasApi.obtenerTiposIngreso()
        ]);
        setMiembros(dataMiembros);
        setTiposIngreso(dataTipos);
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
    setConfirmModal(true);
  };

  const executeSubmit = async () => {
    setConfirmModal(false);
    setSubmitting(true);

    const miembroFinalId = form.miembroBuscador || null;

    try {
      let comprobanteUrl = null;
      if (form.comprobante) {
        comprobanteUrl = await cloudinaryService.uploadFile(form.comprobante, 'ingresos');
      }

      await finanzasApi.registrarPago({
        miembroId: miembroFinalId,
        registradoPor: user?.id,
        tipo_ingreso_id: form.tipo_ingreso_id,
        monto: Number(form.monto),
        descripcion: form.descripcion,
        fecha: form.fecha,
        estado: form.estado,
        comprobanteUrl,
      });
      
      const updatedCuotas = await finanzasApi.obtenerCuotas();
      if (setCuotas) setCuotas(updatedCuotas);

      setMessage({ type: 'success', text: 'Ingreso registrado correctamente.' });
      setForm({ miembroBuscador: '', tipo_ingreso_id: '', monto: '', descripcion: '', fecha: '', estado: 'pagada', comprobante: null });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar la cuota.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registro de ingresos</h1>
          <p className="text-sm text-slate-500">Controla los ingresos de la institucion.</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons 
            data={cuotas.map(c => ({ 
              'Socio (ID)': c.miembroId, 
              'Registrado Por': c.registrado_por_nombre || 'Sistema', 
              'Tipo de Ingreso': c.tipo_ingreso_nombre, 
              Monto: c.monto, 
              Fecha: c.fecha, 
              Estado: c.estado 
            }))} 
            filename="historial_ingresos" 
            title="Reporte de Ingresos Institucionales" 
          />
          <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CreditCard className="h-4 w-4" />
            {cuotas.length} ingresos registrados
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form className="rounded-md bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Nuevo ingreso</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Select
              id="miembroBuscador"
              name="miembroBuscador"
              label="Socio (Opcional)"
              value={form.miembroBuscador}
              onChange={handleChange}
            >
              <option value="">Seleccione un socio (o registre sin asignar)</option>
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.apellidoPaterno || ''} - {m.correoElectronico}
                </option>
              ))}
            </Select>
            <Select
              id="tipo_ingreso_id"
              name="tipo_ingreso_id"
              label="Tipo de Ingreso"
              value={form.tipo_ingreso_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione un tipo...</option>
              {tiposIngreso.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </Select>
            <Input
              id="monto"
              name="monto"
              label="Monto"
              type="number"
              value={form.monto}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
            <Input
              id="descripcion"
              name="descripcion"
              label="Descripción (Opcional)"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Detalle del ingreso"
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
              id="estado"
              name="estado"
              label="Estado"
              value={form.estado}
              onChange={handleChange}
            >
              <option value="pagada">Pagada</option>
              <option value="pendiente">Pendiente</option>
              <option value="vencida">Vencida</option>
            </Select>
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
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
            Guardar ingreso
          </Button>
        </form>

        <div className="rounded-md bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Ultimos registros</h2>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              Buscar
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Cargando cuotas...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : cuotas.length === 0 ? (
              <p className="text-sm text-slate-500">Sin registros disponibles.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Socio</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Monto</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCuotas.map((cuota) => (
                        <tr key={cuota.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{cuota.socio_nombre || cuota.miembroId}</td>
                          <td className="px-4 py-3">{cuota.tipo_ingreso_nombre}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">Bs. {cuota.monto}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${
                              cuota.estado === 'pagada' ? 'bg-emerald-50 text-emerald-700' : 
                              cuota.estado === 'vencida' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                            }`}>
                              {cuota.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {cuota.creacion 
                              ? new Date(cuota.creacion).toLocaleString('es-ES', { 
                                  day: '2-digit', month: '2-digit', year: 'numeric', 
                                  hour: '2-digit', minute: '2-digit', hour12: true 
                                }) 
                              : new Date(cuota.fecha).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setDetalleModal({ open: true, cuota })}
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
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, cuotas.length)} de {cuotas.length} registros
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

      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Confirmar registro de ingreso">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de registrar este ingreso por <strong>Bs. {form.monto}</strong> bajo la descripción "{form.descripcion}"?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setConfirmModal(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={executeSubmit} disabled={submitting}>Confirmar Ingreso</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={detalleModal.open} onClose={() => setDetalleModal({ open: false, cuota: null })} title="Detalle del Ingreso">
        {detalleModal.cuota && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Socio / Miembro</p>
                <p className="font-semibold text-slate-900">{detalleModal.cuota.socio_nombre || detalleModal.cuota.miembroId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Monto Pagado</p>
                <p className="font-semibold text-slate-900">Bs. {detalleModal.cuota.monto}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Tipo de Ingreso</p>
                <p className="text-slate-700">{detalleModal.cuota.tipo_ingreso_nombre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Estado</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                  detalleModal.cuota.estado === 'pagada' ? 'bg-emerald-100 text-emerald-800' : 
                  detalleModal.cuota.estado === 'vencida' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {detalleModal.cuota.estado}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Fecha de Registro</p>
                <p className="text-slate-700">
                  {detalleModal.cuota.creacion 
                    ? new Date(detalleModal.cuota.creacion).toLocaleString('es-ES', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', hour12: true 
                      }) 
                    : new Date(detalleModal.cuota.fecha).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Registrado por</p>
                <p className="text-slate-700">{detalleModal.cuota.registrado_por_nombre}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-medium mb-1">Descripción</p>
                <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200">{detalleModal.cuota.descripcion || 'Sin descripción adicional'}</p>
              </div>
              {detalleModal.cuota.comprobanteUrl && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 font-medium mb-2">Comprobante Adjunto</p>
                  <img 
                    src={detalleModal.cuota.comprobanteUrl} 
                    alt="Comprobante" 
                    className="h-32 w-auto object-cover rounded border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setImageModal({ open: true, url: detalleModal.cuota.comprobanteUrl })}
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
