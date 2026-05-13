import { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Eye, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const ITEMS_PER_PAGE = 10;
  
  // Filtrado de cuotas
  const filteredCuotas = cuotas.filter(cuota => {
    const matchesSearch = (cuota.socio_nombre || cuota.miembroId || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (cuota.tipo_ingreso_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter ? cuota.estado === estadoFilter : true;
    return matchesSearch && matchesEstado;
  });

  const totalPages = Math.ceil(filteredCuotas.length / ITEMS_PER_PAGE);
  const paginatedCuotas = filteredCuotas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
      setIsCreateModalOpen(false);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar la cuota.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSellar = async (id) => {
    try {
      setSubmitting(true);
      await finanzasApi.sellarIngreso(id, user?.id);
      const updatedCuotas = await finanzasApi.obtenerCuotas();
      if (setCuotas) setCuotas(updatedCuotas);
      setMessage({ type: 'success', text: 'Ingreso sellado en Blockchain correctamente.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al sellar: Asegúrese de que el nodo de Blockchain esté activo.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registro de ingresos</h1>
          <p className="text-sm text-slate-500">Administra las cuotas, multas y aportes de los socios.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo ingreso
          </Button>
          <ExportButtons 
            data={filteredCuotas.map(c => ({ 
              Socio: c.socio_nombre || c.miembroId, 
              'Registrado Por': c.registrado_por_nombre || 'Sistema',
              Tipo: c.tipo_ingreso_nombre, 
              Monto: c.monto, 
              Estado: c.estado, 
              Fecha: c.fecha,
              'Tx Blockchain': c.blockchain_tx_id || 'No sellado'
            }))} 
            filename="historial_ingresos" 
            title="Reporte de Ingresos Institucionales" 
          />
        </div>
      </header>

      <section>
        <div className="rounded-md bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Historial de ingresos
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar socio o tipo..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <select
                value={estadoFilter}
                onChange={(e) => { setEstadoFilter(e.target.value); setCurrentPage(1); }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                <option value="">Todos los estados</option>
                <option value="pagada">Pagada</option>
                <option value="vencida">Vencida</option>
                <option value="en_mora">En Mora</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
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
                        <th className="px-4 py-3">Comprobante</th>
                        <th className="px-4 py-3">Monto</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Blockchain ID</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCuotas.map((cuota) => (
                        <tr key={cuota.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{cuota.socio_nombre || cuota.miembroId}</td>
                          <td className="px-4 py-3">{cuota.tipo_ingreso_nombre}</td>
                          <td className="px-4 py-3">
                            {cuota.comprobanteUrl ? (
                              <div 
                                className="h-8 w-12 rounded bg-slate-100 border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setImageModal({ open: true, url: cuota.comprobanteUrl })}
                              >
                                <img src={cuota.comprobanteUrl} alt="Recibo" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Sin adjunto</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              Bs. {cuota.monto}
                              {cuota.blockchain_tx_id && (
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" title="Sellado en Blockchain" />
                              )}
                            </div>
                          </td>
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
                          <td className="px-4 py-3">
                            {cuota.blockchain_tx_id ? (
                              <div className="flex items-center gap-1 text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit" title={cuota.blockchain_tx_id}>
                                <ShieldCheck className="h-3 w-3" />
                                {cuota.blockchain_tx_id.substring(0, 8)}...
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">No sellado</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setDetalleModal({ open: true, cuota })}
                                className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Detalle
                              </button>
                              {!cuota.blockchain_tx_id && (
                                <button 
                                  onClick={() => handleSellar(cuota.id)}
                                  disabled={submitting}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Sellar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredCuotas.length)} de {filteredCuotas.length} registros
                    </p>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        className="h-8 px-2 text-xs" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      
                      {/* Números de página */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "primary" : "outline"}
                          className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}

                      <Button 
                        variant="outline" 
                        className="h-8 px-2 text-xs" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Registrar nuevo ingreso">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
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
              label="Monto (Bs)"
              type="number"
              value={form.monto}
              onChange={handleChange}
              placeholder="0.00"
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
            <div className="md:col-span-2">
              <Input
                id="descripcion"
                name="descripcion"
                label="Descripción / Nota (Opcional)"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Detalle del ingreso"
              />
            </div>
            <Select
              id="estado"
              name="estado"
              label="Estado Inicial"
              value={form.estado}
              onChange={handleChange}
            >
              <option value="pagada">Pagada</option>
              <option value="pendiente">Pendiente</option>
              <option value="vencida">Vencida</option>
            </Select>
            <div>
              <label htmlFor="comprobante" className="block text-sm font-medium text-slate-700 mb-1">
                Comprobante (Opcional)
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
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>Guardar ingreso</Button>
          </div>
        </form>
      </Modal>

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
                <p className="font-semibold text-slate-900">
                  Bs. {detalleModal.cuota.monto}
                  {detalleModal.cuota.blockchain_tx_id && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      <ShieldCheck className="h-3 w-3" /> SELLADO
                    </span>
                  )}
                </p>
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

      <Modal isOpen={imageModal.open} onClose={() => setImageModal({ open: false, url: null })} title="Comprobante de Ingreso">
        <div className="flex justify-center bg-slate-900/5 rounded-xl p-2 overflow-hidden">
          {imageModal.url && (
            <img 
              src={imageModal.url} 
              alt="Comprobante Full" 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
