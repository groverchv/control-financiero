import { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Eye, ChevronLeft, ChevronRight, ShieldCheck, X, AlertCircle, CheckCircle2, Receipt, PlusCircle, BadgeDollarSign, Calendar, FileText } from 'lucide-react';
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
  const [historialSocios, setHistorialSocios] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [detalleModal, setDetalleModal] = useState({ open: false, cuota: null });
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [socioSearch, setSocioSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [comprobantePreview, setComprobantePreview] = useState(null);
  const [configuracionCuotas, setConfiguracionCuotas] = useState(null);
  const [modoIngreso, setModoIngreso] = useState('cuota'); // 'cuota' | 'extra'
  const ITEMS_PER_PAGE = 10;

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => {
    if (!isCreateModalOpen) {
      setSocioSearch('');
      setIsDropdownOpen(false);
      setComprobantePreview(null);
      setModoIngreso('cuota');
      setForm({ miembroBuscador: '', tipo_ingreso_id: '', monto: '', descripcion: '', fecha: '', estado: 'pagada', comprobante: null });
    } else {
      // En modo cuota preseleccionar el tipo cuota si existe
      if (modoIngreso === 'cuota') {
        const cuotaTipo = tiposIngreso.find(t => t.nombre === 'Membresía Ordinaria' || t.nombre === 'Cuota Mensual');
        if (cuotaTipo) {
          setForm(prev => ({ ...prev, tipo_ingreso_id: cuotaTipo.id }));
        }
      }
    }
  }, [isCreateModalOpen]);
  
  // Filtrado de cuotas
  const filteredCuotas = cuotas.filter(cuota => {
    const matchesSearch = (cuota.socio_nombre || cuota.miembroId || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (cuota.tipo_ingreso_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredCuotas.length / ITEMS_PER_PAGE);
  const paginatedCuotas = filteredCuotas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataMiembros, dataTipos, dataHistorial, dataConfig] = await Promise.all([
          administracionApi.obtenerMiembros(),
          finanzasApi.obtenerTiposIngreso(),
          finanzasApi.obtenerHistorialCuotasMiembro(),
          finanzasApi.obtenerConfiguracionCuotas()
        ]);
        setMiembros(dataMiembros);
        setTiposIngreso(dataTipos);
        setHistorialSocios(dataHistorial);
        setConfiguracionCuotas(dataConfig);
      } catch (err) {
        console.error('Error cargando datos previos:', err);
      }
    };
    fetchData();
  }, []);

  // Auto-completar datos si es Membresía Ordinaria / Cuota Mensual
  const tipoSeleccionado = tiposIngreso.find(t => t.id === form.tipo_ingreso_id);
  const esMembresiaOrdinaria = tipoSeleccionado?.nombre === 'Membresía Ordinaria' || tipoSeleccionado?.nombre === 'Cuota Mensual';
  const registroSocio = historialSocios.find(h => h.miembro.id === form.miembroBuscador);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    // En modo cuota: auto-rellenar cuando se selecciona un socio
    if (modoIngreso === 'cuota' && form.miembroBuscador) {
      if (registroSocio && registroSocio.proximaPendiente) {
        const mes = registroSocio.proximaPendiente.mes;
        let desc = '';
        // Intentar parsear como YYYY-MM
        const partes = mes && mes.match(/^(\d{4})-(\d{2})$/);
        if (partes) {
          const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][Number(partes[2]) - 1];
          desc = `Cuota de membresía correspondiente a ${mesNombre} ${partes[1]}.`;
        } else {
          // Intentar parsear como timestamp ISO
          const d = new Date(mes);
          if (!isNaN(d.getTime())) {
            const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][d.getMonth()];
            desc = `Cuota de membresía correspondiente a ${mesNombre} ${d.getFullYear()}.`;
          } else {
            desc = `Cuota de membresía correspondiente a ${mes}.`;
          }
        }
        setForm(prev => ({
          ...prev,
          monto: String(configuracionCuotas?.monto_cuota || 150),
          fecha: registroSocio.proximaPendiente.fechaVencimientoAjustada,
          descripcion: desc
        }));
      } else if (registroSocio) {
        setForm(prev => ({ ...prev, monto: '0', fecha: '', descripcion: 'El socio se encuentra totalmente al día.' }));
      }
    } else if (modoIngreso !== 'cuota' && form.miembroBuscador && form.tipo_ingreso_id) {
      // Modo extra: auto-completar solo si es tipo cuota (fallback al comportamiento anterior)
      if (esMembresiaOrdinaria && registroSocio && registroSocio.proximaPendiente) {
        const mes = registroSocio.proximaPendiente.mes;
        const partes = mes && mes.match(/^(\d{4})-(\d{2})$/);
        let desc = partes
          ? `Cuota de membresía correspondiente a ${ ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][Number(partes[2]) - 1]} ${partes[1]}.`
          : `Cuota de membresía correspondiente a ${mes}.`;
        setForm(prev => ({ ...prev, monto: String(configuracionCuotas?.monto_cuota || 150), fecha: registroSocio.proximaPendiente.fechaVencimientoAjustada, descripcion: desc }));
      }
    }
  }, [modoIngreso, form.miembroBuscador, form.tipo_ingreso_id, registroSocio, configuracionCuotas, esMembresiaOrdinaria]);

  const handleChange = (event) => {
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
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage(null);

    if (esMembresiaOrdinaria && form.miembroBuscador) {
      if (registroSocio && !registroSocio.proximaPendiente) {
        setMessage({ type: 'error', text: 'No se puede registrar el pago. El socio ya se encuentra totalmente al día con todas sus cuotas.' });
        return;
      }
    }

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

      setResultModal({
        open: true,
        type: 'success',
        text: '¡Ingreso registrado correctamente!',
        details: 'El ingreso ha sido sellado con éxito en la Blockchain e integrado en el flujo de caja de la institución.'
      });
      setForm({ miembroBuscador: '', tipo_ingreso_id: '', monto: '', descripcion: '', fecha: '', estado: 'pagada', comprobante: null });
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se pudo registrar el ingreso',
        details: err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql en Supabase.'
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
    } catch {
      setMessage({ type: 'error', text: 'Error al sellar: Asegúrese de que el nodo de Blockchain esté activo.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && <Toast type={message.type} message={message.text} onClose={() => setMessage(null)} />}
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
                        <th className="px-4 py-3">Monto</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Registrado</th>
                        <th className="px-4 py-3">Blockchain</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCuotas.map((cuota) => (
                        <tr key={cuota.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div>
                              <p className="font-semibold">{cuota.socio_nombre || 'Sin Asignar'}</p>
                              {cuota.socio_correo && <p className="text-[10px] text-slate-400">{cuota.socio_correo}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">{cuota.tipo_ingreso_nombre}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              Bs. {cuota.monto}
                              {cuota.blockchain_tx_id && (
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" title="Sellado en Blockchain" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700">
                              Pagado
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            <div>
                              <p className="text-xs font-medium text-slate-700">{cuota.registrado_por_nombre}</p>
                              {cuota.registrado_por_rol && <p className="text-[10px] text-slate-400 capitalize">{cuota.registrado_por_rol}</p>}
                            </div>
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

          {/* ── Selector de modo ── */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setModoIngreso('cuota');
                const cuotaTipo = tiposIngreso.find(t => t.nombre === 'Membresía Ordinaria' || t.nombre === 'Cuota Mensual');
                setForm(prev => ({
                  ...prev,
                  tipo_ingreso_id: cuotaTipo?.id || '',
                  monto: '', descripcion: '', fecha: '', miembroBuscador: ''
                }));
                setSocioSearch('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                modoIngreso === 'cuota'
                  ? 'bg-white shadow-sm text-emerald-700 border border-emerald-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Receipt className="h-4 w-4" />
              Cuota de Membresía
            </button>
            <button
              type="button"
              onClick={() => {
                setModoIngreso('extra');
                setForm(prev => ({ ...prev, tipo_ingreso_id: '', monto: '', descripcion: '', miembroBuscador: '' }));
                setSocioSearch('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                modoIngreso === 'extra'
                  ? 'bg-white shadow-sm text-blue-700 border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Ingreso Extra
            </button>
          </div>

          {/* ── MODO CUOTA ── */}
          {modoIngreso === 'cuota' && (
            <div className="space-y-4">
              <div className="relative">
                <label className="text-sm font-medium text-slate-700 block mb-1">Socio <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar socio por nombre o correo..."
                    className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-10"
                    value={socioSearch}
                    onChange={(e) => {
                      setSocioSearch(e.target.value);
                      setIsDropdownOpen(true);
                      if (!e.target.value) setForm(prev => ({ ...prev, miembroBuscador: '' }));
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {form.miembroBuscador ? (
                      <button type="button" onClick={() => { setForm(prev => ({ ...prev, miembroBuscador: '', monto: '', descripcion: '', fecha: '' })); setSocioSearch(''); }} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <Search className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg z-20">
                      {miembros.filter(m => m.estado !== 'inactivo').filter(m => {
                        const n = `${m.nombre} ${m.apellidoPaterno || ''} ${m.apellidoMaterno || ''}`.toLowerCase();
                        return n.includes(socioSearch.toLowerCase()) || (m.correoElectronico || '').toLowerCase().includes(socioSearch.toLowerCase());
                      }).map(m => (
                        <button key={m.id} type="button"
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex flex-col border-b border-slate-50 last:border-0"
                          onClick={() => { setForm(prev => ({ ...prev, miembroBuscador: m.id })); setSocioSearch(`${m.nombre} ${m.apellidoPaterno || ''} - ${m.correoElectronico}`); setIsDropdownOpen(false); }}
                        >
                          <span className="font-semibold">{m.nombre} {m.apellidoPaterno || ''} {m.apellidoMaterno || ''}</span>
                          <span className="text-xs text-slate-500">{m.correoElectronico}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Info de cuota autocargada */}
              {form.miembroBuscador && registroSocio && (
                <div className={`p-4 rounded-xl border text-sm leading-relaxed ${
                  registroSocio.proximaPendiente
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {registroSocio.proximaPendiente ? (
                    <>
                      <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /> Cuota pendiente detectada
                      </p>
                      <div className="space-y-1">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Periodo: <strong>{form.descripcion ? form.descripcion.replace('Cuota de membresía correspondiente a ', '').replace('.','') : '...'}</strong>
                        </p>
                        <p className="flex items-center gap-2">
                          <BadgeDollarSign className="h-3.5 w-3.5 shrink-0" />
                          Monto: <strong>Bs. {Number(configuracionCuotas?.monto_cuota || 150).toFixed(2)}</strong>
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Vencimiento: <strong>{form.fecha ? new Date(form.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}</strong>
                        </p>
                      </div>
                      <p className="mt-2 text-[11px] text-amber-700 font-medium flex items-start gap-1">
                        <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                        Campos autocompletados según la cuota pendiente más antigua.
                      </p>
                    </>
                  ) : (
                    <p className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      El socio está al día. No tiene cuotas pendientes.
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Monto (Bs)</label>
                  <input
                    type="number"
                    value={form.monto}
                    readOnly
                    className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 cursor-not-allowed"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={form.fecha}
                    readOnly
                    className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Descripción (autogenerada)</label>
                <input
                  type="text"
                  value={form.descripcion}
                  readOnly
                  className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-not-allowed"
                  placeholder="Se completará al seleccionar un socio..."
                />
              </div>
            </div>
          )}

          {/* ── MODO INGRESO EXTRA ── */}
          {modoIngreso === 'extra' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
                ℹ️ Para ingresos adicionales (multas, donaciones, eventos, etc.). El tipo de ingreso es obligatorio.
              </div>

              {/* Buscar socio (opcional en extra) */}
              <div className="relative">
                <label className="text-sm font-medium text-slate-700 block mb-1">Socio (Opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar socio por nombre o correo..."
                    className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                    value={socioSearch}
                    onChange={(e) => { setSocioSearch(e.target.value); setIsDropdownOpen(true); if (!e.target.value) setForm(prev => ({ ...prev, miembroBuscador: '' })); }}
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {form.miembroBuscador ? (
                      <button type="button" onClick={() => { setForm(prev => ({ ...prev, miembroBuscador: '' })); setSocioSearch(''); }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                    ) : (<Search className="h-4 w-4 text-slate-400" />)}
                  </div>
                </div>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg z-20">
                      {miembros.filter(m => m.estado !== 'inactivo').filter(m => {
                        const n = `${m.nombre} ${m.apellidoPaterno || ''} ${m.apellidoMaterno || ''}`.toLowerCase();
                        return n.includes(socioSearch.toLowerCase()) || (m.correoElectronico || '').toLowerCase().includes(socioSearch.toLowerCase());
                      }).map(m => (
                        <button key={m.id} type="button"
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex flex-col border-b border-slate-50 last:border-0"
                          onClick={() => { setForm(prev => ({ ...prev, miembroBuscador: m.id })); setSocioSearch(`${m.nombre} ${m.apellidoPaterno || ''} - ${m.correoElectronico}`); setIsDropdownOpen(false); }}
                        >
                          <span className="font-semibold">{m.nombre} {m.apellidoPaterno || ''} {m.apellidoMaterno || ''}</span>
                          <span className="text-xs text-slate-500">{m.correoElectronico}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Tipo de ingreso - OBLIGATORIO en modo extra */}
              <Select
                id="tipo_ingreso_id"
                name="tipo_ingreso_id"
                label={<span>Tipo de Ingreso <span className="text-red-500">*</span></span>}
                value={form.tipo_ingreso_id}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un tipo...</option>
                {tiposIngreso
                  .filter(t => t.nombre !== 'Membresía Ordinaria' && t.nombre !== 'Cuota Mensual')
                  .map(tipo => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)
                }
              </Select>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  id="monto"
                  name="monto"
                  label={<span>Monto (Bs) <span className="text-red-500">*</span></span>}
                  type="number"
                  value={form.monto}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
                <Input
                  id="fecha"
                  name="fecha"
                  label={<span>Fecha <span className="text-red-500">*</span></span>}
                  type="date"
                  value={form.fecha}
                  onChange={handleChange}
                  required
                />
              </div>
              <Input
                id="descripcion"
                name="descripcion"
                label="Descripción / Nota (Opcional)"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Detalle del ingreso"
              />
            </div>
          )}
          {/* Comprobante (aplica a ambos modos) */}
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {comprobantePreview && (
              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg max-w-xs relative">
                <p className="text-xs text-slate-400 font-medium mb-1">Previsualización:</p>
                <div className="relative rounded overflow-hidden border border-slate-100">
                  <img
                    src={comprobantePreview}
                    alt="Vista previa del comprobante"
                    className="max-h-40 w-auto object-cover rounded shadow-sm cursor-pointer hover:opacity-90"
                    onClick={() => setImageModal({ open: true, url: comprobantePreview })}
                  />
                  <button
                    type="button"
                    onClick={() => { setForm(prev => ({ ...prev, comprobante: null })); setComprobantePreview(null); const fi = document.getElementById('comprobante'); if (fi) fi.value = ''; }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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

      <Modal isOpen={detalleModal.open} onClose={() => setDetalleModal({ open: false, cuota: null })} title="Detalle del Ingreso" width="max-w-2xl">
        {detalleModal.cuota && (
          <div className="space-y-5 text-sm">

            {/* Socio / Miembro */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Socio / Miembro</p>
              {detalleModal.cuota.miembroId ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {detalleModal.cuota.socio_nombre?.charAt(0) || '?'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                    <div>
                      <p className="text-[10px] text-slate-400">Nombre completo</p>
                      <p className="font-semibold text-slate-900">{detalleModal.cuota.socio_nombre}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Rol</p>
                      <p className="font-semibold text-slate-900 capitalize">{detalleModal.cuota.socio_rol || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Correo</p>
                      <p className="text-slate-700">{detalleModal.cuota.socio_correo || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Teléfono</p>
                      <p className="text-slate-700">{detalleModal.cuota.socio_telefono || '—'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">Ingreso sin socio asignado</p>
              )}
            </div>

            {/* Registrado por */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Registrado por</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {detalleModal.cuota.registrado_por_nombre?.charAt(0) || 'S'}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                  <div>
                    <p className="text-[10px] text-blue-400">Nombre completo</p>
                    <p className="font-semibold text-slate-900">{detalleModal.cuota.registrado_por_nombre || 'Sistema'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400">Rol</p>
                    <p className="font-semibold text-slate-900 capitalize">{detalleModal.cuota.registrado_por_rol || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400">Correo</p>
                    <p className="text-slate-700">{detalleModal.cuota.registrado_por_correo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400">Teléfono</p>
                    <p className="text-slate-700">{detalleModal.cuota.registrado_por_telefono || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos del ingreso */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Tipo de Ingreso</p>
                <p className="font-semibold text-slate-900">{detalleModal.cuota.tipo_ingreso_nombre}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Monto Pagado</p>
                <p className="font-bold text-lg text-emerald-700">
                  Bs. {detalleModal.cuota.monto}
                  {detalleModal.cuota.blockchain_tx_id && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      <ShieldCheck className="h-3 w-3" /> SELLADO
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Estado</p>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  ✓ Pagado
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">Fecha de Registro</p>
                <p className="text-slate-700">
                  {detalleModal.cuota.creacion 
                    ? new Date(detalleModal.cuota.creacion).toLocaleString('es-ES', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', hour12: true 
                      }) 
                    : new Date(detalleModal.cuota.fecha).toLocaleDateString('es-ES')}
                </p>
              </div>
              {detalleModal.cuota.blockchain_tx_id && (
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 font-medium mb-1">Blockchain TX ID</p>
                  <p className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg break-all">{detalleModal.cuota.blockchain_tx_id}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 font-medium mb-1">Descripción</p>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">{detalleModal.cuota.descripcion || 'Sin descripción adicional'}</p>
              </div>
            </div>

            {/* Comprobante */}
            {detalleModal.cuota.comprobanteUrl && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Comprobante de Pago</p>
                <img 
                  src={detalleModal.cuota.comprobanteUrl} 
                  alt="Comprobante" 
                  className="max-h-56 w-auto object-contain rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                  onClick={() => setImageModal({ open: true, url: detalleModal.cuota.comprobanteUrl })}
                  title="Haga clic para ampliar"
                />
                <p className="text-[10px] text-slate-400 mt-2">Haga clic en la imagen para ampliar</p>
              </div>
            )}
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
