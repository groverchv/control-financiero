import { useState } from 'react';
import { ClipboardList, Search, Eye, ChevronLeft, ChevronRight, ShieldCheck, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { finanzasApi } from '../api';
import { patrimonioApi } from '../../patrimonio/api';
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
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [comprobantePreview, setComprobantePreview] = useState(null);
  const ITEMS_PER_PAGE = 10;
  
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!isCreateModalOpen) {
      setComprobantePreview(null);
    }
  }, [isCreateModalOpen]);
  
  // Filtrado de egresos
  const filteredEgresos = egresos.filter(egreso => {
    const matchesSearch = (egreso.concepto || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (egreso.registrado_por_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFilter ? egreso.categoria === categoriaFilter : true;
    return matchesSearch && matchesCategoria;
  });

  const totalPages = Math.ceil(filteredEgresos.length / ITEMS_PER_PAGE);
  const paginatedEgresos = filteredEgresos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  const handleChange = async (event) => {
    const { name, value, type, files } = event.target;
    if (type === 'file') {
      const file = files[0] || null;
      setForm((prev) => ({ ...prev, [name]: file }));
      if (file && file.type.startsWith('image/')) {
        setComprobantePreview(URL.createObjectURL(file));
      } else {
        setComprobantePreview(null);
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      
      // Si se selecciona un activo, revisar si tiene plan de amortización pendiente
      if (name === 'activo_id' && value) {
        try {
          const plan = await patrimonioApi.obtenerAmortizacion(value);
          const cuotaPendiente = plan.find(p => p.estado === 'pendiente');
          if (cuotaPendiente) {
            setForm(prev => ({ ...prev, monto: cuotaPendiente.monto.toString() }));
            setMessage({ type: 'success', text: `Monto completado según cuota #${cuotaPendiente.numero} del plan de amortización.` });
          }
        } catch (err) {
          console.error("Error al obtener plan de amortización", err);
        }
      }
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
        comprobanteUrl,
      });
      
      const updatedEgresos = await finanzasApi.obtenerEgresos();
      if (setEgresos) setEgresos(updatedEgresos);

      setResultModal({
        open: true,
        type: 'success',
        text: '¡Egreso registrado correctamente!',
        details: 'El egreso operativo ha sido descontado del saldo del activo (si corresponde) y sellado exitosamente en la Blockchain.'
      });
      setForm({ concepto: '', monto: '', tipo_egreso_id: '', activo_id: '', descripcion: '', comprobante: null });
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se pudo registrar el egreso',
        details: err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql en Supabase.'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleSellar = async (id) => {
    try {
      setSubmitting(true);
      await finanzasApi.sellarEgreso(id, user?.id);
      const updatedEgresos = await finanzasApi.obtenerEgresos();
      if (setEgresos) setEgresos(updatedEgresos);
      setMessage({ type: 'success', text: 'Registro sellado en Blockchain correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'Error al sellar: Asegúrese de que el nodo de Blockchain esté activo.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && <Toast type={message.type} message={message.text} onClose={() => setMessage(null)} />}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registro de egresos</h1>
          <p className="text-sm text-slate-500">Controla los egresos operativos de la institucion.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo egreso
          </Button>
          <ExportButtons 
            data={filteredEgresos.map(e => ({ 
              Concepto: e.concepto, 
              'Registrado Por': e.registrado_por_nombre || 'Sistema',
              Monto: e.monto, 
              Fecha: e.fecha, 
              Categoria: e.categoria,
              'Tx Blockchain': e.blockchain_tx_id || 'No sellado'
            }))} 
            filename="historial_egresos" 
            title="Reporte de Egresos Institucionales" 
          />
        </div>
      </header>

      <section>
        <div className="rounded-md bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Egresos registrados
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por concepto o registrador..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={categoriaFilter}
                onChange={(e) => { setCategoriaFilter(e.target.value); setCurrentPage(1); }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px] truncate"
              >
                <option value="">Todas las categorias</option>
                {tiposEgreso.map(t => (
                  <option key={t.id} value={t.nombre}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
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
                        <th className="px-4 py-3">Blockchain ID</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedEgresos.map((egreso) => (
                        <tr key={egreso.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{egreso.concepto}</td>
                          <td className="px-4 py-3">{egreso.categoria}</td>

                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              Bs. {egreso.monto}
                              {egreso.blockchain_tx_id && (
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" title="Sellado en Blockchain" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {egreso.creacion 
                              ? new Date(egreso.creacion).toLocaleString('es-ES', { 
                                  day: '2-digit', month: '2-digit', year: 'numeric', 
                                  hour: '2-digit', minute: '2-digit', hour12: true 
                                }) 
                              : new Date(egreso.fecha).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-4 py-3">
                            {egreso.blockchain_tx_id ? (
                              <div className="flex items-center gap-1 text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit" title={egreso.blockchain_tx_id}>
                                <ShieldCheck className="h-3 w-3" />
                                {egreso.blockchain_tx_id.substring(0, 8)}...
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">No sellado</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setDetalleModal({ open: true, egreso })}
                                className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Detalle
                              </button>
                              {!egreso.blockchain_tx_id && (
                                <button 
                                  onClick={() => handleSellar(egreso.id)}
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
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredEgresos.length)} de {filteredEgresos.length} registros
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

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Registrar nuevo egreso">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
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
            <Input
              id="concepto"
              name="concepto"
              label="Concepto"
              value={form.concepto}
              onChange={handleChange}
              placeholder="Mantenimiento, servicios, etc."
              required
            />
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
              id="monto"
              name="monto"
              label="Monto (Bs)"
              type="number"
              value={form.monto}
              onChange={handleChange}
              required
            />
            <div className="md:col-span-2">
              <Input
                id="descripcion"
                name="descripcion"
                label="Detalle de egreso (Opcional)"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Descripción adicional..."
              />
            </div>
            <div className="md:col-span-2">
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
              
              {/* Previsualización de Comprobante */}
              {comprobantePreview && (
                <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg max-w-xs relative group animate-in fade-in duration-200">
                  <p className="text-xs text-slate-400 font-medium mb-1">Previsualización de Imagen:</p>
                  <div className="relative rounded overflow-hidden border border-slate-100">
                    <img 
                      src={comprobantePreview} 
                      alt="Vista previa del comprobante" 
                      className="max-h-40 w-auto object-cover rounded shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setImageModal({ open: true, url: comprobantePreview })}
                      title="Haga clic para ampliar"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Haga clic en la imagen para ampliar</p>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, comprobante: null }));
                        setComprobantePreview(null);
                        const fileInput = document.getElementById('comprobante');
                        if (fileInput) fileInput.value = '';
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                      title="Eliminar archivo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>Registrar egreso</Button>
          </div>
        </form>
      </Modal>

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

      <Modal isOpen={detalleModal.open} onClose={() => setDetalleModal({ open: false, egreso: null })} title="Detalle del Egreso" width="max-w-2xl">
        {detalleModal.egreso && (
          <div className="space-y-5 text-sm">

            {/* Registrado por */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Registrado por</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {detalleModal.egreso.registrado_por_nombre?.charAt(0) || 'S'}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                  <div>
                    <p className="text-[10px] text-blue-400">Nombre completo</p>
                    <p className="font-semibold text-slate-900">{detalleModal.egreso.registrado_por_nombre || 'Sistema'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400">Rol</p>
                    <p className="font-semibold text-slate-900 capitalize">{detalleModal.egreso.registrado_por_rol || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400">Correo</p>
                    <p className="text-slate-700">{detalleModal.egreso.registrado_por_correo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400">Teléfono</p>
                    <p className="text-slate-700">{detalleModal.egreso.registrado_por_telefono || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activo Asociado (Si aplica) */}
            {detalleModal.egreso.activo_id && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 animate-in fade-in duration-200">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">Activo Físico Asociado</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    A
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-500">Nombre del Activo</p>
                    <p className="font-semibold text-slate-900">{detalleModal.egreso.activo_nombre || 'Activo Físico'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Datos del egreso */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Concepto</p>
                <p className="font-semibold text-slate-900">{detalleModal.egreso.concepto}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Monto Egresado</p>
                <p className="font-bold text-lg text-red-600">
                  Bs. {detalleModal.egreso.monto}
                  {detalleModal.egreso.blockchain_tx_id && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      <ShieldCheck className="h-3 w-3" /> SELLADO
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Tipo de Egreso</p>
                <p className="text-slate-700">{detalleModal.egreso.categoria}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Fecha Lógica</p>
                <p className="text-slate-700">{new Date(detalleModal.egreso.fecha).toLocaleDateString('es-ES')}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Fecha de Registro</p>
                <p className="text-slate-700">
                  {detalleModal.egreso.creacion 
                    ? new Date(detalleModal.egreso.creacion).toLocaleString('es-ES', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', hour12: true 
                      }) 
                    : new Date(detalleModal.egreso.fecha).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Estado</p>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-800 uppercase tracking-wider">
                  ✓ Egresado
                </span>
              </div>
              {detalleModal.egreso.blockchain_tx_id && (
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 font-medium mb-1">Blockchain TX ID</p>
                  <p className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg break-all">{detalleModal.egreso.blockchain_tx_id}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 font-medium mb-1">Descripción</p>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">{detalleModal.egreso.descripcion || 'Sin descripción adicional'}</p>
              </div>
            </div>

            {/* Comprobante */}
            {detalleModal.egreso.comprobanteUrl && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Comprobante de Egreso</p>
                <img 
                  src={detalleModal.egreso.comprobanteUrl} 
                  alt="Comprobante" 
                  className="max-h-56 w-auto object-contain rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                  onClick={() => setImageModal({ open: true, url: detalleModal.egreso.comprobanteUrl })}
                  title="Haga clic para ampliar"
                />
                <p className="text-[10px] text-slate-400 mt-2">Haga clic en la imagen para ampliar</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={imageModal.open} onClose={() => setImageModal({ open: false, url: null })} title="Comprobante de Egreso">
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

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Registro Exitoso" : "Error al Registrar"} 
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
