import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CreditCard, Plus, Search, Eye, ChevronLeft, ChevronRight, ShieldCheck, X, AlertCircle, CheckCircle2, Receipt, PlusCircle, BadgeDollarSign, Calendar, RefreshCw, BookOpen } from 'lucide-react';
import { finanzasApi } from '../api';
import { administracionApi } from '../../administracion/api';
import { usePagos } from '../hooks';
import { Button, Input, Select, Spinner, ExportButtons, Modal } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { cloudinaryService } from '../../../services/cloudinary';
import { useAuthStore } from '../../../store/authStore';
// Helpers para extracción y formateo robusto de cuotas pendientes
const getCuotaGeneracionDate = (pendiente) => {
  if (!pendiente) return '';
  if (pendiente.fechaGeneracion) return pendiente.fechaGeneracion.split('T')[0];
  
  const mes = pendiente.mes;
  if (mes) {
    // Extraer DD/MM/YYYY (ej: Min 21/5/2026 13:30 -> 2026-05-21)
    const match = mes.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    // Extraer YYYY-MM (ej: 2026-05 -> 2026-05-01)
    const matchMonth = mes.match(/^(\d{4})-(\d{2})$/);
    if (matchMonth) {
      return `${matchMonth[1]}-${matchMonth[2]}-01`;
    }
  }
  
  // Fallback a los vencimientos si todo lo demás falla
  return pendiente.fechaVencimiento || pendiente.fechaVencimientoAjustada || new Date().toISOString().split('T')[0];
};

const formatPeriodoLabel = (pendiente, desc) => {
  if (!pendiente) return '...';
  const mes = pendiente.mes;
  if (!mes) return '...';
  
  // Limpiar prefijos de frecuencia corta (ej: Min 21/5/2026 13:30 -> 21/5/2026 13:30)
  const cleanMes = mes.replace(/^(Min|Día|Sem)\s+/, '');
  
  // Si es un mes en formato mensual YYYY-MM, usar la descripción más amigable (ej: Mayo 2026)
  if (mes.match(/^\d{4}-\d{2}$/)) {
    if (desc) {
      return desc.replace('Cuota de membresía correspondiente a ', '').replace('.', '');
    }
  }
  return cleanMes;
};

export const RegistroCuotasPage = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const { cuotas, loading, error, setCuotas, refetch } = usePagos();
  const handleRefresh = async () => {
    await refetch();
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
      console.error('Error refrescando datos secundarios:', err);
    }
  };
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
  const [devolverModal, setDevolverModal] = useState({ open: false, cuota: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [socioSearch, setSocioSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [comprobantePreview, setComprobantePreview] = useState(null);
  const [configuracionCuotas, setConfiguracionCuotas] = useState(null);
  const [modoIngreso, setModoIngreso] = useState('cuota'); // 'cuota' | 'extra'
  const [inscripcionesPendientes, setInscripcionesPendientes] = useState([]);
  const [inscripcionSeleccionada, setInscripcionSeleccionada] = useState(null);
  const [loadingInscripciones, setLoadingInscripciones] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Determinar si el tipo de ingreso seleccionado es "Pago de Actividad"
  const tipoActividadSeleccionado = tiposIngreso.find(t => t.id === form.tipo_ingreso_id);
  const esPagoActividad = tipoActividadSeleccionado?.nombre?.toLowerCase().includes('actividad');

  const isSubmitDisabled = modoIngreso === 'cuota'
    ? (!form.miembroBuscador || !form.monto || !form.fecha)
    : (esPagoActividad
      ? (!form.tipo_ingreso_id || !form.monto || !form.fecha || !inscripcionSeleccionada)
      : (!form.tipo_ingreso_id || !form.monto || !form.fecha));

  // Cargar inscripciones pendientes cuando se selecciona socio + tipo Pago de Actividad en modo extra
  useEffect(() => {
    let isMounted = true;
    if (modoIngreso === 'extra' && esPagoActividad && form.miembroBuscador) {
      const fetchInscripciones = async () => {
        setLoadingInscripciones(true);
        try {
          const data = await finanzasApi.obtenerInscripcionesPendientesPago(form.miembroBuscador);
          if (isMounted) {
            setInscripcionesPendientes(data);
            
            // Si venimos de una redirección con un ID de inscripción específico, auto-seleccionarlo
            if (location.state?.inscripcionId) {
              const match = data.find(i => i.id === location.state.inscripcionId);
              if (match) {
                setInscripcionSeleccionada(match);
                setForm(prev => ({
                  ...prev,
                  monto: String(match.actividad.costo),
                  fecha: new Date().toISOString().split('T')[0],
                  descripcion: `Pago de inscripción a actividad: ${match.actividad.titulo}`
                }));
              }
            }
          }
        } catch (err) {
          console.error('Error cargando inscripciones pendientes:', err);
          if (isMounted) {
            setInscripcionesPendientes([]);
          }
        } finally {
          if (isMounted) {
            setLoadingInscripciones(false);
          }
        }
      };
      fetchInscripciones();
    } else {
      const timer = setTimeout(() => {
        if (isMounted) {
          setInscripcionesPendientes([]);
          setInscripcionSeleccionada(null);
        }
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [modoIngreso, esPagoActividad, form.miembroBuscador, location.state]);

  // Manejar redirección automática desde el Historial de Actividades o Historial de Cuotas
  useEffect(() => {
    if (location.state && location.state.autoOpenCreate) {
      const state = location.state;
      
      const findTipoActividad = async () => {
        try {
          const dataTipos = await finanzasApi.obtenerTiposIngreso();
          setTiposIngreso(dataTipos);
          
          if (state.isCuota) {
            const cuotaTipo = dataTipos.find(t => t.nombre === 'Membresía Ordinaria' || t.nombre === 'Cuota Mensual');
            setModoIngreso('cuota');
            setIsCreateModalOpen(true);
            
            setForm(prev => ({
              ...prev,
              miembroBuscador: state.socioId,
              tipo_ingreso_id: cuotaTipo ? cuotaTipo.id : '',
              monto: String(state.monto),
              descripcion: state.descripcion || 'Pago de Cuota de Membresía',
              fecha: new Date().toISOString().split('T')[0],
              estado: 'pagada',
            }));
            
            setSocioSearch(`${state.socioNombre} - ${state.socioCorreo || ''}`);
          } else {
            const tipoAct = dataTipos.find(t => t.nombre?.toLowerCase().includes('actividad'));
            if (tipoAct) {
              setModoIngreso('extra');
              setIsCreateModalOpen(true);
              
              // Rellenar formulario inicial
              setForm(prev => ({
                ...prev,
                miembroBuscador: state.socioId,
                tipo_ingreso_id: tipoAct.id,
                monto: String(state.monto),
                descripcion: `Pago de inscripción a actividad: ${state.actividadTitulo}`,
                fecha: new Date().toISOString().split('T')[0],
                estado: 'pagada',
              }));
              
              setSocioSearch(`${state.socioNombre} - ${state.socioCorreo || ''}`);
              
              const mockInscripcion = {
                id: state.inscripcionId,
                actividad: {
                  id: state.actividadId,
                  titulo: state.actividadTitulo,
                  costo: state.monto,
                  fecha: new Date().toISOString().split('T')[0],
                }
              };
              setInscripcionSeleccionada(mockInscripcion);
              setInscripcionesPendientes([mockInscripcion]);
            }
          }
        } catch (err) {
          console.error('[RegistroIngresos] Error pre-rellenando pago desde historial:', err);
        }
      };
      
      findTipoActividad();
      
      // Limpiar el estado de navegación para evitar reaperturas accidentales al refrescar
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocioSearch('');
      setIsDropdownOpen(false);
      setComprobantePreview(null);
      setModoIngreso('cuota');
      setInscripcionesPendientes([]);
      setInscripcionSeleccionada(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Helper para convertir el formato de mes a nombre amigable en español de forma robusta
  const parseMesToNombre = (mesStr) => {
    if (!mesStr) return '';
    
    // 1. Intentar parsear como YYYY-MM (ej: 2026-06)
    const matchIso = mesStr.match(/^(\d{4})-(\d{2})$/);
    if (matchIso) {
      const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][Number(matchIso[2]) - 1];
      return `${mesNombre} ${matchIso[1]}`;
    }

    // 2. Intentar parsear formato DD/MM/YYYY con o sin prefijo (ej: "Min 1/6/2026 14:24")
    const matchSpanish = mesStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchSpanish) {
      const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][Number(matchSpanish[2]) - 1];
      return `${mesNombre} ${matchSpanish[3]}`;
    }

    // 3. Fallback a objeto Date de JS
    const d = new Date(mesStr);
    if (!isNaN(d.getTime())) {
      const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][d.getMonth()];
      return `${mesNombre} ${d.getFullYear()}`;
    }

    return mesStr;
  };

  useEffect(() => {
    // En modo cuota: auto-rellenar cuando se selecciona un socio
    if (modoIngreso === 'cuota' && form.miembroBuscador) {
      if (registroSocio && registroSocio.proximaPendiente) {
        const mes = registroSocio.proximaPendiente.mes;
        const periodoNombre = parseMesToNombre(mes);
        const desc = `Cuota de membresía correspondiente a ${periodoNombre}.`;
        
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm(prev => ({
          ...prev,
          monto: String(registroSocio.proximaPendiente.monto_esperado || configuracionCuotas?.monto_cuota || 150),
          fecha: getCuotaGeneracionDate(registroSocio.proximaPendiente),
          descripcion: desc
        }));
      } else if (registroSocio) {
        setForm(prev => ({ ...prev, monto: '0', fecha: '', descripcion: 'El socio se encuentra totalmente al día.' }));
      }
    } else if (modoIngreso !== 'cuota' && form.miembroBuscador && form.tipo_ingreso_id) {
      // Modo extra: auto-completar solo si es tipo cuota (fallback al comportamiento anterior)
      if (esMembresiaOrdinaria && registroSocio && registroSocio.proximaPendiente) {
        const mes = registroSocio.proximaPendiente.mes;
        const periodoNombre = parseMesToNombre(mes);
        const desc = `Cuota de membresía correspondiente a ${periodoNombre}.`;
        setForm(prev => ({ ...prev, monto: String(registroSocio.proximaPendiente.monto_esperado || configuracionCuotas?.monto_cuota || 150), fecha: getCuotaGeneracionDate(registroSocio.proximaPendiente), descripcion: desc }));
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
      let finalValue = value;
      if (name === 'monto') {
        finalValue = value.length > 1 && value.startsWith('0') && !value.startsWith('0.') ? value.substring(1) : value;
      }
      setForm((prev) => ({ ...prev, [name]: finalValue }));
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
        inscripcionId: inscripcionSeleccionada?.id || null,
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

  const handleDevolver = (cuota) => {
    setDevolverModal({ open: true, cuota });
  };

  const executeDevolucion = async () => {
    const { cuota } = devolverModal;
    if (!cuota) return;
    
    setSubmitting(true);
    try {
      await finanzasApi.devolverIngreso(cuota.id, user?.id);
      const updatedCuotas = await finanzasApi.obtenerCuotas();
      if (setCuotas) setCuotas(updatedCuotas);

      setDevolverModal({ open: false, cuota: null });
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Reembolso procesado!',
        details: 'El ingreso ha sido devuelto con éxito. Su monto ahora figura en Bs. 0 y el estado es "Devuelto". La transacción de reembolso ha sido sellada en la Blockchain.'
      });
    } catch (err) {
      console.error(err);
      setDevolverModal({ open: false, cuota: null });
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error en Reembolso',
        details: err instanceof Error ? err.message : 'No se pudo registrar la devolución del ingreso.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular métricas dinámicas para los KPIs
  const totalRecaudado = cuotas.reduce((sum, c) => c.estado !== 'devolucion' ? sum + Number(c.monto || 0) : sum, 0);
  const totalCuotas = cuotas.reduce((sum, c) => (c.estado !== 'devolucion' && (c.tipo_ingreso_nombre === 'Membresía Ordinaria' || c.tipo_ingreso_nombre === 'Cuota Mensual')) ? sum + Number(c.monto || 0) : sum, 0);
  const totalExtras = cuotas.reduce((sum, c) => (c.estado !== 'devolucion' && c.tipo_ingreso_nombre !== 'Membresía Ordinaria' && c.tipo_ingreso_nombre !== 'Cuota Mensual') ? sum + Number(c.monto || 0) : sum, 0);
  const totalReembolsosPendientes = cuotas.reduce((sum, c) => c.estado === 'reembolso_pendiente' ? sum + Number(c.monto || 0) : sum, 0);

  return (
    <div className="space-y-6">
      {message && <Toast type={message.type} message={message.text} onClose={() => setMessage(null)} />}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registro de ingresos</h1>
          <p className="text-sm text-slate-500">Administra las cuotas, multas y aportes de los socios.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons 
            data={filteredCuotas.map(c => ({ 
              Socio: c.socio_nombre || c.miembroId, 
              'Registrado Por': c.registrado_por_nombre || 'Sistema',
              Tipo: c.tipo_ingreso_nombre, 
              Monto: c.monto, 
              Estado: c.estado, 
              Fecha: c.fecha
            }))} 
            filename="historial_ingresos" 
            title="Reporte de Ingresos Institucionales" 
          />
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-2">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="sm:hidden text-xs">Nuevo</span>
            <span className="hidden sm:inline text-sm">Nuevo ingreso</span>
          </Button>
        </div>
      </header>

      {/* Tarjetas de Métricas de Ingresos */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-emerald-600 truncate">
              {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(totalRecaudado)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Ingresos Totales</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-blue-600 truncate">
              {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(totalCuotas)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Ingreso de Cuotas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-indigo-600 truncate">
              {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(totalExtras)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Ingresos Extras</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-orange-600 truncate">
              {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(totalReembolsosPendientes)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Ingresos para Reembolsar</p>
          </div>
        </div>
      </div>

      <section>
        <div className="rounded-md bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Historial de ingresos
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
              title="Refrescar listado"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar socio o tipo..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-sm text-slate-500">{filteredCuotas.length} registros</span>
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
                            {cuota.estado === 'reembolso_pendiente' ? (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
                                Reembolso Pendiente
                              </span>
                            ) : cuota.estado === 'devolucion' ? (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 border border-rose-200">
                                Devuelto
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700">
                                Pagado
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            <div>
                              <p className="text-xs font-medium text-slate-700">{cuota.registrado_por_nombre}</p>
                              {cuota.registrado_por_rol && <p className="text-[10px] text-slate-400 capitalize">{cuota.registrado_por_rol}</p>}
                            </div>
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
                              {cuota.estado === 'reembolso_pendiente' && (
                                <button 
                                  onClick={() => handleDevolver(cuota)}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-sm"
                                >
                                  Devolver
                                </button>
                              )}
                              {!cuota.blockchain_tx_id && cuota.estado !== 'devolucion' && (
                                <button 
                                  onClick={() => handleSellar(cuota.id)}
                                  disabled={submitting}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                                  title="Reintentar sellar de forma manual"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Reintentar
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
                setForm(prev => ({ ...prev, tipo_ingreso_id: '', monto: '', descripcion: '', miembroBuscador: '', fecha: new Date().toISOString().split('T')[0] }));
                setSocioSearch('');
                setInscripcionesPendientes([]);
                setInscripcionSeleccionada(null);
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
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          Generación: <strong>{formatPeriodoLabel(registroSocio.proximaPendiente, form.descripcion)}</strong>
                        </p>
                        <p className="flex items-center gap-2">
                          <BadgeDollarSign className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          Monto: <strong>Bs. {Number(registroSocio.proximaPendiente.monto_esperado || configuracionCuotas?.monto_cuota || 150).toFixed(2)}</strong>
                        </p>
                      </div>
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
                  <label className="text-sm font-medium text-slate-700 block mb-1">Fecha de la cuota (Generación)</label>
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

              {/* ── Selector de actividad pendiente (solo si tipo = Pago de Actividad y hay socio) ── */}
              {esPagoActividad && (
                <div className="space-y-3">
                  {!form.miembroBuscador ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Seleccione un socio para ver sus actividades con pago pendiente.
                    </div>
                  ) : loadingInscripciones ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 p-3">
                      <Spinner size="sm" /> Cargando actividades pendientes...
                    </div>
                  ) : inscripcionesPendientes.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      Este socio no tiene actividades con pago pendiente.
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">
                        Actividad a pagar <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {inscripcionesPendientes.map((insc) => (
                          <button
                            key={insc.id}
                            type="button"
                            onClick={() => {
                              setInscripcionSeleccionada(insc);
                              setForm(prev => ({
                                ...prev,
                                monto: String(insc.actividad.costo),
                                fecha: new Date().toISOString().split('T')[0],
                                descripcion: `Pago de inscripción a actividad: ${insc.actividad.titulo}`
                              }));
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                              inscripcionSeleccionada?.id === insc.id
                                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                            }`}
                          >
                            <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              inscripcionSeleccionada?.id === insc.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-900 truncate">{insc.actividad.titulo}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500">
                                  {insc.actividad.fecha ? new Date(insc.actividad.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha'}
                                </span>
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Bs. {Number(insc.actividad.costo).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            {inscripcionSeleccionada?.id === insc.id && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={modoIngreso === 'extra' ? "grid gap-3 grid-cols-1" : "grid gap-3 md:grid-cols-2"}>
                <Input
                  id="monto"
                  name="monto"
                  label={<span>Monto (Bs) <span className="text-red-500">*</span></span>}
                  type="number"
                  value={form.monto}
                  onChange={(e) => {
                    const val = e.target.value;
                    // R13: Borrar ceros a la izquierda para mejor UX
                    if (val === '') {
                      setForm(prev => ({ ...prev, monto: '' }));
                    } else {
                      const num = parseFloat(val);
                      setForm(prev => ({ ...prev, monto: isNaN(num) ? 0 : num }));
                    }
                  }}
                  onBlur={() => {
                    if (form.monto === '') {
                      setForm(prev => ({ ...prev, monto: 0 }));
                    }
                  }}
                  placeholder="0.00"
                  required
                  readOnly={esPagoActividad && !!inscripcionSeleccionada}
                />
                {modoIngreso !== 'extra' && (
                  <Input
                    id="fecha"
                    name="fecha"
                    label={<span>Fecha <span className="text-red-500">*</span></span>}
                    type="date"
                    value={form.fecha}
                    onChange={handleChange}
                    required
                  />
                )}
              </div>
              <Input
                id="descripcion"
                name="descripcion"
                label="Descripción / Nota (Opcional)"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Detalle del ingreso"
                readOnly={esPagoActividad && !!inscripcionSeleccionada}
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
            <Button 
              type="submit" 
              disabled={submitting || isSubmitDisabled}
              className={isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""}
            >
              Guardar ingreso
            </Button>
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

            {/* Devuelto por (solo si está devuelto y tiene la marca en la descripción) */}
            {(() => {
              const desc = detalleModal.cuota.descripcion || '';
              const match = desc.match(/\[Devuelto por: ([^\]]+)\]/);
              if (!match) return null;

              const devueltoPorInfo = match[1];
              let devName;
              let devRol = '—';
              let devEmail = '—';
              let devPhone = '—';

              const parts1 = devueltoPorInfo.split(' [');
              const nameAndRole = parts1[0];
              const contactInfo = parts1[1] ? parts1[1].replace(']', '') : '';

              if (nameAndRole.includes(' (')) {
                const parts2 = nameAndRole.split(' (');
                devName = parts2[0];
                devRol = parts2[1] ? parts2[1].replace(')', '') : '—';
              } else {
                devName = nameAndRole;
              }

              if (contactInfo) {
                const parts3 = contactInfo.split(' | Tel: ');
                devEmail = parts3[0] || '—';
                devPhone = parts3[1] || '—';
              }

              return (
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-3">Devolución realizada por</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {devName.charAt(0)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1 text-sm">
                      <div>
                        <p className="text-[10px] text-orange-500">Nombre completo</p>
                        <p className="font-semibold text-slate-900">{devName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-orange-500">Rol</p>
                        <p className="font-semibold text-slate-900 capitalize">{devRol}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-orange-500">Correo</p>
                        <p className="text-slate-700">{devEmail}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-orange-500">Teléfono</p>
                        <p className="text-slate-700">{devPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                    : new Date(detalleModal.cuota.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
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

      {/* R21: Modal de confirmación para Devolución */}
      <Modal 
        isOpen={devolverModal.open} 
        onClose={() => setDevolverModal({ open: false, cuota: null })} 
        title="Confirmar Devolución de Ingreso"
        width="max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span>
                ¿Está seguro de procesar el reembolso para este ingreso? Esta acción es <strong>irreversible</strong>, fijará el monto del ingreso a <strong>Bs. 0.00</strong>, actualizará su estado a <strong>"Devuelto"</strong>, y sellará la transacción de devolución en la Blockchain.
              </span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setDevolverModal({ open: false, cuota: null })}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={executeDevolucion}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {submitting ? 'Procesando...' : 'Sí, confirmar devolución'}
            </Button>
          </div>
        </div>
      </Modal>

      <LoadingOverlay open={submitting} text="Estamos procesando la transacción, subiendo los archivos adjuntos y sellando el registro financiero en la Blockchain de forma segura." />
    </div>
  );
};
