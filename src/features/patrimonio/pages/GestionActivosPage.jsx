import { useState, useEffect } from 'react';
import { PackagePlus, Search, Tags, ShieldCheck, ChevronLeft, ChevronRight, X, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { useActivos } from '../hooks';
import { Button, Input, Spinner, Modal, Select, ExportButtons } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { patrimonioApi } from '../api';
import { useAuthStore } from '../../../store/authStore';
import { cloudinaryService } from '../../../services/cloudinary';

export const GestionActivosPage = () => {
  const { activos, loading, error, setActivos } = useActivos();
  const { user } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    tipo_activo_id: '',
    descripcion: '',
    costo_total: 0,
    fechaAdquisicion: '',
    imagen: null
  });
  const [tiposActivo, setTiposActivo] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [detalleModal, setDetalleModal] = useState({ open: false, activo: null });
  const [activePlan, setActivePlan] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });

  useEffect(() => {
    if (detalleModal.activo) {
      setLoadingPlan(true);
      patrimonioApi.obtenerAmortizacion(detalleModal.activo.id)
        .then(plan => {
          setActivePlan(plan || []);
        })
        .catch(err => {
          console.error('Error fetching plan:', err);
          setActivePlan([]);
        })
        .finally(() => {
          setLoadingPlan(false);
        });
    } else {
      setActivePlan([]);
    }
  }, [detalleModal.activo]);

  useEffect(() => {
    if (!isModalOpen) {
      setImagePreview(null);
    }
  }, [isModalOpen]);

  // Filtrado de activos
  const filteredActivos = activos.filter(activo => {
    const matchesSearch = (activo.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (activo.tipo_activo?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter ? activo.estado === estadoFilter : true;
    return matchesSearch && matchesEstado;
  });

  useEffect(() => {
    const loadTipos = async () => {
      try {
        const data = await patrimonioApi.obtenerTiposActivo();
        setTiposActivo(data);
      } catch (err) {
        console.error('Error al cargar tipos de activo:', err);
      }
    };
    loadTipos();
  }, []);

  const columns = [
    { 
      key: 'imagen_url', 
      label: 'Imagen',
      render: (val) => val ? (
        <img 
          src={val} 
          alt="Activo" 
          className="h-10 w-10 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => setImageModal({ open: true, url: val })}
          title="Haga clic para ampliar"
        />
      ) : (
        <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Sin foto</div>
      )
    },
    { 
      key: 'nombre', 
      label: 'Nombre',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          {val}
          {row.blockchain_tx_id && (
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" title="Sellado en Blockchain" />
          )}
        </div>
      )
    },
    { 
      key: 'tipo_activo', 
      label: 'Tipo',
      render: (val) => val?.nombre || 'Sin tipo'
    },
    { 
      key: 'costo_total', 
      label: 'Costo Total',
      render: (val) => <span className="font-medium text-slate-900">{new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val || 0)}</span>
    },
    { 
      key: 'saldo_pendiente', 
      label: 'Saldo Pendiente',
      render: (val) => <span className={`font-medium ${val > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val || 0)}</span>
    },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (val) => (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          val === 'pagado' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
        }`}>
          {val === 'pagado' ? 'Pagado' : 'Deuda'}
        </span>
      )
    },
    { key: 'fechaAdquisicion', label: 'Fecha' },
    { 
      key: 'blockchain_tx_id', 
      label: 'Blockchain ID',
      render: (val) => val ? (
        <div className="flex items-center gap-1 text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit" title={val}>
          <ShieldCheck className="h-3 w-3" />
          {val.substring(0, 8)}...
        </div>
      ) : (
        <span className="text-[10px] text-slate-400">No sellado</span>
      )
    },
    {
      key: 'id',
      label: 'Acciones',
      render: (id, row) => (
        <div className="flex justify-end gap-2">
          <Button 
            size="xs" 
            variant="outline" 
            className="text-blue-600 border-blue-200 hover:bg-blue-50 h-7 flex items-center gap-1"
            onClick={() => setDetalleModal({ open: true, activo: row })}
          >
            <Eye className="h-3 w-3" />
            Detalle
          </Button>
          {!row.blockchain_tx_id && (
            <Button 
              size="xs" 
              variant="outline" 
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-7"
              onClick={() => handleSellar(id)}
              disabled={isSubmitting}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Sellar
            </Button>
          )}
        </div>
      )
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imagen_url = null;
      if (formData.imagen) {
        imagen_url = await cloudinaryService.uploadFile(formData.imagen, 'activos');
      }

      const payload = {
        miembro_id: user?.id,
        tipo_activo_id: formData.tipo_activo_id || null,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        costo_total: formData.costo_total,
        saldo_pendiente: formData.costo_total, // Al inicio el saldo es igual al costo
        fechaAdquisicion: formData.fechaAdquisicion,
        imagen_url,
        estado: 'deuda'
      };

      const nuevoActivo = await patrimonioApi.registrarActivo(payload);
      setActivos([nuevoActivo, ...activos]);
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Activo registrado con éxito!',
        details: `El activo "${formData.nombre}" ha sido registrado en el inventario patrimonial. Puede generar un plan de amortización si es necesario.`
      });
      setIsModalOpen(false);
      setFormData({ 
        nombre: '', 
        tipo_activo_id: '',
        descripcion: '',
        costo_total: 0,
        fechaAdquisicion: '',
        imagen: null 
      });
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se pudo registrar el activo',
        details: err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellar = async (id) => {
    setIsSubmitting(true);
    try {
      await patrimonioApi.sellarActivo(id, user?.id);
      const updatedData = await patrimonioApi.obtenerActivos();
      setActivos(updatedData);
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Activo sellado en la Blockchain!',
        details: 'El activo patrimonial y sus firmas de auditoría han sido grabados y sellados de manera inmutable.'
      });
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error de sellado Blockchain',
        details: err instanceof Error ? err.message : 'Error al sellar: Verifique que la red Blockchain esté activa.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de Activos</h1>
          <p className="text-sm text-slate-500">Control del inventario institucional.</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons 
            data={filteredActivos.map(a => ({ 
              Activo: a.nombre, 
              Tipo: a.tipo_activo?.nombre, 
              Costo: a.costo_total, 
              Estado: a.estado, 
              Fecha: a.fechaAdquisicion,
              'Tx Blockchain': a.blockchain_tx_id || 'No sellado'
            }))} 
            filename="lista_activos" 
            title="Inventario de Activos Institucionales" 
          />
          <Button type="button" onClick={() => setIsModalOpen(true)}>
            <PackagePlus className="h-4 w-4" />
            Registrar activo
          </Button>
        </div>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 w-full max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="pagado">Pagado</option>
              <option value="deuda">Con Deuda</option>
            </select>
          </div>
          <span className="text-sm text-slate-500">{filteredActivos.length} activos</span>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando activos...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <>
              <Table columns={columns} rows={filteredActivos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)} emptyMessage="No hay activos registrados o no coinciden con la busqueda." />
              
              {Math.ceil(filteredActivos.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                  <p className="text-xs text-slate-500">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredActivos.length)} de {filteredActivos.length} activos
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
                    
                    {Array.from({ length: Math.ceil(filteredActivos.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
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
                      disabled={currentPage === (Math.ceil(filteredActivos.length / ITEMS_PER_PAGE))}
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredActivos.length / ITEMS_PER_PAGE), p + 1))}
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
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar nuevo activo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre del Activo" 
            value={formData.nombre} 
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
            required 
          />
          <Select
            label="Tipo de Activo"
            value={formData.tipo_activo_id}
            onChange={(e) => setFormData({ ...formData, tipo_activo_id: e.target.value })}
            required
          >
            <option value="">Seleccione un tipo...</option>
            {tiposActivo.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </Select>
          <Input 
            label="Descripción (Opcional)" 
            value={formData.descripcion} 
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
            placeholder="Detalles del activo..."
          />
          <Input 
            label="Costo Total ($)" 
            type="number"
            step="0.01" 
            value={formData.costo_total} 
            onChange={(e) => setFormData({ ...formData, costo_total: parseFloat(e.target.value) || 0 })} 
            required
          />
          <Input 
            label="Fecha de Adquisición" 
            type="date" 
            value={formData.fechaAdquisicion} 
            onChange={(e) => setFormData({ ...formData, fechaAdquisicion: e.target.value })} 
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Imagen del Activo</label>
            <input 
              id="imagen"
              type="file" 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                setFormData({ ...formData, imagen: file });
                if (file && file.type.startsWith('image/')) {
                  setImagePreview(URL.createObjectURL(file));
                } else {
                  setImagePreview(null);
                }
              }}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {imagePreview && (
              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg max-w-xs relative group animate-in fade-in duration-200">
                <p className="text-xs text-slate-400 font-medium mb-1">Previsualización del Activo:</p>
                <div className="relative rounded overflow-hidden border border-slate-100">
                  <img 
                    src={imagePreview} 
                    alt="Vista previa de activo" 
                    className="max-h-40 w-auto object-cover rounded shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setImageModal({ open: true, url: imagePreview })}
                    title="Haga clic para ampliar"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Haga clic para ampliar</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, imagen: null }));
                      setImagePreview(null);
                      const fileInput = document.getElementById('imagen');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                    title="Eliminar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Activo'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={imageModal.open} onClose={() => setImageModal({ open: false, url: null })} title="Imagen del Activo">
        <div className="flex justify-center bg-slate-900/5 rounded-xl p-2 overflow-hidden">
          {imageModal.url && (
            <img 
              src={imageModal.url} 
              alt="Activo Completo" 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={detalleModal.open} 
        onClose={() => setDetalleModal({ open: false, activo: null })} 
        title="Detalle del Activo"
      >
        {detalleModal.activo && (
          <div className="space-y-4">
            {/* Encabezado */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{detalleModal.activo.nombre}</p>
                <p className="text-xs text-slate-500">{detalleModal.activo.tipo_activo?.nombre || 'Sin tipo'}</p>
              </div>
            </div>

            {/* Datos del Activo */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Costo Total</p>
                <p className="font-semibold text-slate-900">
                  {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(detalleModal.activo.costo_total || 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Saldo Pendiente</p>
                <p className={`font-bold ${detalleModal.activo.saldo_pendiente > 0 ? 'text-orange-600' : 'text-emerald-700'}`}>
                  {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(detalleModal.activo.saldo_pendiente || 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Estado</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  detalleModal.activo.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {detalleModal.activo.estado === 'pagado' ? '✓ Pagado' : '⚠ Deuda'}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Fecha de Adquisición</p>
                <p className="text-slate-700">{detalleModal.activo.fechaAdquisicion || 'No especificada'}</p>
              </div>
              {detalleModal.activo.blockchain_tx_id && (
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 font-medium mb-1">Blockchain TX ID</p>
                  <p className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg break-all">
                    {detalleModal.activo.blockchain_tx_id}
                  </p>
                </div>
              )}
              {detalleModal.activo.descripcion && (
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 font-medium mb-1">Descripción</p>
                  <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                    {detalleModal.activo.descripcion}
                  </p>
                </div>
              )}
            </div>

            {/* Imagen del Activo */}
            {detalleModal.activo.imagen_url && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Foto del Activo</p>
                <img 
                  src={detalleModal.activo.imagen_url} 
                  alt="Activo" 
                  className="max-h-56 w-auto object-contain rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                  onClick={() => setImageModal({ open: true, url: detalleModal.activo.imagen_url })}
                  title="Haga clic para ampliar"
                />
                <p className="text-[10px] text-slate-400 mt-2">Haga clic en la imagen para ampliar</p>
              </div>
            )}

            {/* Plan de Amortización / Cronograma */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cronograma de Amortización</p>
              {loadingPlan ? (
                <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-400">
                  <Spinner size="sm" />
                  Cargando cronograma...
                </div>
              ) : activePlan.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/50 text-[10px] uppercase text-slate-500 font-semibold">
                      <tr>
                        <th className="px-3 py-2 rounded-l-md">Cuota #</th>
                        <th className="px-3 py-2">Vencimiento</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                        <th className="px-3 py-2 rounded-r-md text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      {activePlan.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-100/40">
                          <td className="px-3 py-2 font-medium text-slate-800">Cuota {c.numero}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {new Date(c.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(c.monto || 0)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              c.estado === 'pagada' || c.estado === 'pagado'
                                ? 'bg-emerald-50 text-emerald-705 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {c.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">Este activo no cuenta con un plan de amortización generado.</p>
              )}
            </div>
          </div>
        )}
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
