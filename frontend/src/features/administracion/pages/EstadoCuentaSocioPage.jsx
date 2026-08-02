import { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  CreditCard, Search, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, GraduationCap, Clock,
  TrendingDown, BookOpen, Upload
} from 'lucide-react';
import { finanzasApi } from '../../finanzas/api';
import { useAuthStore } from '../../../store/authStore';
import { Table } from '../../../components/data-display';
import { Spinner, ExportButtons, Button, Modal, Input } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { supabase } from '../../../services/supabase';
import { cloudinaryService } from '../../../services/cloudinary';

const ITEMS_PER_PAGE = 10;

const Pagination = ({ current, total, onPageChange, filteredCount, label = 'registros' }) => {
  if (total <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-4">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-semibold text-slate-900">{((current - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
        <span className="font-semibold text-slate-900">{Math.min(current * ITEMS_PER_PAGE, filteredCount)}</span> de{' '}
        <span className="font-semibold text-slate-900">{filteredCount}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
        >
          <ChevronLeft className="h-3 w-3" /> Anterior
        </button>
        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl">
          {current} / {total}
        </span>
        <button
          onClick={() => onPageChange(Math.min(total, current + 1))}
          disabled={current === total}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
        >
          Siguiente <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export const EstadoCuentaSocioPage = () => {
  const { user } = useAuthStore();

  // ─── Cuotas state ───────────────────────────────────────────────
  const [cuotasData, setCuotasData] = useState(null); // { cronograma, mesesPagados, mesesDeuda }
  const [loadingCuotas, setLoadingCuotas] = useState(true);
  const [searchCuotas, setSearchCuotas] = useState('');
  const [pageCuotas, setPageCuotas] = useState(1);
  const [filtroEstadoCuotas, setFiltroEstadoCuotas] = useState('todas'); // 'todas', 'pendientes', 'pagadas'

  // ─── Actividades state ──────────────────────────────────────────
  const [inscripciones, setInscripciones] = useState([]);
  const [loadingActs, setLoadingActs] = useState(true);
  const [searchActs, setSearchActs] = useState('');
  const [pageActs, setPageActs] = useState(1);
  const [filtroEstadoActs, setFiltroEstadoActs] = useState('todas'); // 'todas', 'pendientes', 'pagadas'

  // ─── Reporte Pago state ──────────────────────────────────────────
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeQrs, setActiveQrs] = useState([]);
  const [tiposIngreso, setTiposIngreso] = useState([]);
  const [conceptType, setConceptType] = useState('cuota'); // 'cuota' | 'actividad'
  const [selectedConcept, setSelectedConcept] = useState(''); // mes (cuota) o inscripcionId (actividad)
  const [reportAmount, setReportAmount] = useState('');
  const [selectedQrId, setSelectedQrId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fechaTransferencia, setFechaTransferencia] = useState(new Date().toISOString().split('T')[0]);
  const [reportNotes, setReportNotes] = useState('');
  
  // Carga/Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [toast, setToast] = useState({ open: false, type: 'success', text: '' });
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [motivoRechazoModal, setMotivoRechazoModal] = useState({ open: false, motivo: '' });

  const [reportedIngresos, setReportedIngresos] = useState([]);

  const fetchReportedIngresos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('ingreso')
        .select('*')
        .eq('miembro_id', user.id)
        .in('estado', ['pendiente', 'rechazado'])
        .order('creacion', { ascending: false });
      if (error) throw error;
      setReportedIngresos(data || []);
    } catch (err) {
      console.error("Error al cargar ingresos reportados:", err);
    }
  }, [user]);

  // ─── Carga de cuotas del usuario ────────────────────────────────
  const fetchCuotas = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCuotas(true);
    try {
      const historial = await finanzasApi.obtenerHistorialCuotasMiembro(true);
      const miRegistro = historial.find(h => h.miembro?.id === user.id);
      if (miRegistro) {
        // Obtener todos los ingresos aprobados de tipo cuota del miembro para auto-sincronizar en el frontend
        const { data: approvedIngresos } = await supabase
          .from('ingreso')
          .select('*')
          .eq('miembro_id', user.id)
          .eq('estado', 'pagada');

        if (approvedIngresos && approvedIngresos.length > 0) {
          miRegistro.cronograma = miRegistro.cronograma.map(c => {
            const hasApprovedPago = approvedIngresos.some(ai => 
              ai.descripcion && ai.descripcion.includes(`Reporte de cuota: ${c.mes}`)
            );
            if (hasApprovedPago) {
              return {
                ...c,
                pagado: true,
                monto_pagado: c.monto_esperado
              };
            }
            return c;
          });

          // Recalcular meses de deuda y meses pagados
          miRegistro.mesesDeuda = miRegistro.cronograma.filter(c => !c.pagado).length;
          miRegistro.mesesPagados = miRegistro.cronograma.filter(c => c.pagado).length;
        }

        setCuotasData(miRegistro);
      } else {
        setCuotasData({ cronograma: [], mesesPagados: 0, mesesDeuda: 0 });
      }
    } catch (error) {
      console.error("Error al cargar cuotas:", error);
      setCuotasData({ cronograma: [], mesesPagados: 0, mesesDeuda: 0 });
    } finally {
      setLoadingCuotas(false);
    }
  }, [user]);

  // ─── Carga de inscripciones del usuario ─────────────────────────
  const fetchInscripciones = useCallback(async () => {
    if (!user?.id) return;
    setLoadingActs(true);
    try {
      const { data, error } = await supabase
        .from('inscripcion')
        .select(`
          id,
          estado,
          fecha_inscripcion,
          actividad:actividad_id(
            id, titulo, costo, fecha, hora, modalidad,
            tipo_actividad:tipo_actividad_id(nombre)
          ),
          ingreso(monto, estado)
        `)
        .eq('miembro_id', user.id)
        .order('fecha_inscripcion', { ascending: false });

      if (error) throw error;
      setInscripciones(data || []);
    } catch (error) {
      console.error("Error al cargar inscripciones:", error);
    } finally {
      setLoadingActs(false);
    }
  }, [user]);

  const loadAllData = useCallback(async () => {
    await Promise.all([fetchCuotas(), fetchInscripciones(), fetchReportedIngresos()]);
  }, [fetchCuotas, fetchInscripciones, fetchReportedIngresos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllData();
    /// eslint-disable-next-line react-hooks/set-state-in-effect
    finanzasApi.obtenerTiposIngreso()
      .then(setTiposIngreso)
      .catch(err => console.error("Error cargando tipos de ingreso:", err));
  }, [loadAllData]);

  // Cargar códigos QR activos al abrir el modal de reporte
  useEffect(() => {
    if (isReportModalOpen) {
      const fetchActiveQrs = async () => {
        try {
          const qrs = await finanzasApi.obtenerQrs();
          setActiveQrs(qrs.filter(q => q.activo));
        } catch (err) {
          console.error("Error cargando QRs activos:", err);
        }
      };
      fetchActiveQrs();
    }
  }, [isReportModalOpen]);

  const filteredActiveQrs = useMemo(() => {
    if (!conceptType) return activeQrs;
    const targetTipo = tiposIngreso.find(t => 
      conceptType === 'cuota'
        ? (t.nombre.toLowerCase().includes('cuota') || t.nombre.toLowerCase().includes('membres'))
        : (t.nombre.toLowerCase().includes('actividad') || t.nombre.toLowerCase().includes('curso') || t.nombre.toLowerCase().includes('evento') || t.nombre.toLowerCase().includes('inscrip'))
    );
    if (!targetTipo) {
      return activeQrs.filter(q => !q.tipo_ingreso_id);
    }
    return activeQrs.filter(q => !q.tipo_ingreso_id || q.tipo_ingreso_id === targetTipo.id);
  }, [activeQrs, conceptType, tiposIngreso]);

  // ─── Formatters ─────────────────────────────────────────────────
  const formatCurrency = (val) => `Bs ${Number(val || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const formatDateShort = (dateString) => {
    if (!dateString) return '—';
    const raw = typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T00:00:00' : dateString;
    return new Date(raw).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ─── Cronograma filtrado de cuotas ──────────────────────────────
  const cronograma = useMemo(() => {
    const raw = cuotasData?.cronograma || [];
    return [...raw].sort((a, b) => new Date(b.creacion) - new Date(a.creacion));
  }, [cuotasData?.cronograma]);

  const filteredCuotas = useMemo(() => {
    let list = cronograma;
    if (filtroEstadoCuotas === 'pendientes') {
      list = list.filter(c => !c.pagado);
    } else if (filtroEstadoCuotas === 'pagadas') {
      list = list.filter(c => c.pagado);
    }

    if (!searchCuotas.trim()) return list;
    const q = searchCuotas.toLowerCase();
    return list.filter(c => {
      const estado = c.pagado ? 'pagada' : 'pendiente';
      const monto = c.pagado ? formatCurrency(c.monto_pagado || c.monto_esperado) : formatCurrency(c.monto_esperado);
      return (
        c.mes.toLowerCase().includes(q) ||
        estado.includes(q) ||
        monto.toLowerCase().includes(q)
      );
    });
  }, [cronograma, filtroEstadoCuotas, searchCuotas]);

  const totalPagesCuotas = Math.ceil(filteredCuotas.length / ITEMS_PER_PAGE);
  const paginatedCuotas = filteredCuotas.slice((pageCuotas - 1) * ITEMS_PER_PAGE, pageCuotas * ITEMS_PER_PAGE);

  // ─── Inscripciones filtradas ────────────────────────────────────
  const filteredActs = useMemo(() => {
    let list = inscripciones;
    if (filtroEstadoActs === 'pendientes') {
      list = list.filter(i => i.estado !== 'pagado' && (i.actividad?.costo || 0) > 0);
    } else if (filtroEstadoActs === 'pagadas') {
      list = list.filter(i => i.estado === 'pagado' || (i.actividad?.costo || 0) === 0);
    }

    if (!searchActs.trim()) return list;
    const q = searchActs.toLowerCase();
    return list.filter(i => {
      const titulo = (i.actividad?.titulo || '').toLowerCase();
      const estado = i.estado === 'pagado' || (i.actividad?.costo || 0) === 0 ? 'pagado' : 'pendiente';
      return titulo.includes(q) || estado.includes(q);
    });
  }, [inscripciones, searchActs, filtroEstadoActs]);

  const totalPagesActs = Math.ceil(filteredActs.length / ITEMS_PER_PAGE);
  const paginatedActs = filteredActs.slice((pageActs - 1) * ITEMS_PER_PAGE, pageActs * ITEMS_PER_PAGE);

  // ─── KPI totals ─────────────────────────────────────────────────
  const cuotasPendientes = cronograma.filter(c => !c.pagado);
  const totalPendienteCuotas = cuotasPendientes.reduce((sum, c) => sum + Number(c.monto_esperado || 0), 0);

  const actsPendientes = useMemo(() => {
    return inscripciones.filter(i => {
      const costo = i.actividad?.costo || 0;
      const validIngresos = i.ingreso ? i.ingreso.filter(ing => ing.estado !== 'devolucion') : [];
      const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
      return totalPaid < costo && costo > 0;
    });
  }, [inscripciones]);

  const totalPendienteActs = useMemo(() => {
    return actsPendientes.reduce((sum, i) => {
      const costo = i.actividad?.costo || 0;
      const validIngresos = i.ingreso ? i.ingreso.filter(ing => ing.estado !== 'devolucion') : [];
      const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
      return sum + (costo - totalPaid);
    }, 0);
  }, [actsPendientes]);

  const deudaGlobalTotal = totalPendienteCuotas + totalPendienteActs;

  // ─── Columns cuotas ─────────────────────────────────────────────
  const cuotasColumns = [
    { key: 'periodo', label: 'Periodo' },
    { key: 'monto_display', label: 'Monto' },
    { key: 'estado_display', label: 'Estado' },
    { key: 'acciones', label: 'Acción' },
  ];

  const cuotasRows = paginatedCuotas.map((c, idx) => {
    const matchingIngresos = reportedIngresos.filter(pi => 
      pi.descripcion && pi.descripcion.includes(`Reporte de cuota: ${c.mes}`)
    );
    const reportedPago = matchingIngresos.length > 0 ? matchingIngresos[0] : null;
    const esPendienteRevision = reportedPago && reportedPago.estado === 'pendiente';
    const esRechazado = reportedPago && reportedPago.estado === 'rechazado';

    return {
      id: c.mes + '-' + ((pageCuotas - 1) * ITEMS_PER_PAGE + idx),
      periodo: (
        <span className="font-semibold text-slate-800 text-sm">{c.mes}</span>
      ),
      monto_display: (
        <span className={`font-bold text-sm ${c.pagado ? 'text-emerald-600' : 'text-red-600'}`}>
          {c.pagado ? formatCurrency(c.monto_pagado || c.monto_esperado) : formatCurrency(c.monto_esperado)}
        </span>
      ),
      estado_display: c.pagado ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> PAGADA
        </span>
      ) : esPendienteRevision ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
          <Clock className="h-3 w-3" /> EN REVISIÓN
        </span>
      ) : esRechazado ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-700">
          <AlertCircle className="h-3 w-3" /> RECHAZADA
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-700">
          <AlertCircle className="h-3 w-3" /> PENDIENTE
        </span>
      ),
      acciones: (c.pagado || esPendienteRevision) ? (
        <span className="text-slate-400 text-xs font-semibold">—</span>
      ) : esRechazado ? (
        <div className="flex items-center gap-2 flex-wrap">
          {(() => {
            const matches = [...(reportedPago.descripcion || '').matchAll(/\[Rechazado\. Motivo:\s*([^\]]+)\]/gi)];
            const motivoText = matches.length > 0 ? matches[matches.length - 1][1] : 'Comprobante rechazado';
            return (
              <button
                onClick={() => setMotivoRechazoModal({ open: true, motivo: motivoText })}
                className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 hover:bg-red-100 px-2 py-1 text-xs font-bold text-red-700 transition-colors shadow-sm"
                title="Ver motivo del rechazo del pago"
              >
                <AlertCircle className="h-3 w-3" /> Ver Detalle
              </button>
            );
          })()}
          <button
            onClick={() => handleReportPagoItem('cuota', c.mes)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 transition-colors shadow-sm"
            title="Volver a reportar pago de esta cuota"
          >
            <Upload className="h-3 w-3" /> Volver a reportar
          </button>
        </div>
      ) : (
        <button
          onClick={() => handleReportPagoItem('cuota', c.mes)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 transition-colors shadow-sm"
          title="Reportar Pago de esta cuota"
        >
          <Upload className="h-3 w-3" /> Reportar Pago
        </button>
      ),
    };
  });

  // ─── Columns actividades ────────────────────────────────────────
  const actsColumns = [
    { key: 'actividad', label: 'Actividad' },
    { key: 'fecha_inscripcion_display', label: 'Inscripción' },
    { key: 'costo_display', label: 'Costo' },
    { key: 'estado_display', label: 'Estado' },
    { key: 'acciones', label: 'Acción' },
  ];

  const actsRows = paginatedActs.map((ins, idx) => {
    const tienePagoEnRevision = ins.ingreso && ins.ingreso.some(ing => ing.estado === 'pendiente');
    const validIngresos = ins.ingreso ? ins.ingreso.filter(ing => ing.estado === 'pagada') : [];
    const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
    const costo = ins.actividad?.costo || 0;
    const isFullyPaid = totalPaid >= costo || costo === 0;

    return {
      id: ins.id || ((pageActs - 1) * ITEMS_PER_PAGE + idx),
      actividad: (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 text-sm">{ins.actividad?.titulo || 'Sin nombre'}</span>
          <span className="text-[10px] text-slate-400">
            {ins.actividad?.fecha ? formatDateShort(ins.actividad.fecha) : ''} 
            {ins.actividad?.hora ? ` · ${ins.actividad.hora.substring(0, 5)}` : ''}
          </span>
        </div>
      ),
      fecha_inscripcion_display: (
        <span className="text-sm text-slate-600">{formatDate(ins.fecha_inscripcion)}</span>
      ),
      costo_display: (() => {
        if (totalPaid > costo && costo > 0) {
          return (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-800">
                {formatCurrency(costo)}
              </span>
              <span className="text-[10px] text-slate-400">
                Pagado: {formatCurrency(totalPaid)}
              </span>
            </div>
          );
        }
        
        const displayMonto = isFullyPaid ? totalPaid : costo;
        return (
          <span className={`font-bold text-sm ${Number(displayMonto || 0) > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
            {formatCurrency(displayMonto || 0)}
          </span>
        );
      })(),
      estado_display: (() => {
        if (totalPaid > costo && costo > 0) {
          const refund = totalPaid - costo;
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              <AlertCircle className="h-3 w-3" /> DEVOLUCIÓN (Bs. {Number(refund).toFixed(2)} a favor)
            </span>
          );
        }
        
        if (isFullyPaid) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> PAGADO
            </span>
          );
        }

        if (tienePagoEnRevision) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              <Clock className="h-3 w-3" /> EN REVISIÓN
            </span>
          );
        }
        
        if (totalPaid > 0) {
          const remaining = costo - totalPaid;
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-700">
              <AlertCircle className="h-3 w-3" /> DEUDA (Resta Bs. {Number(remaining).toFixed(2)})
            </span>
          );
        }
        
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            <Clock className="h-3 w-3" /> PENDIENTE
          </span>
        );
      })(),
      acciones: (isFullyPaid || tienePagoEnRevision) ? (
        <span className="text-slate-400 text-xs font-semibold">—</span>
      ) : (
        <button
          onClick={() => handleReportPagoItem('actividad', ins.id)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 transition-colors shadow-sm"
          title="Reportar Pago de esta actividad"
        >
          <Upload className="h-3 w-3" /> Reportar Pago
        </button>
      ),
    };
  });

  const pendingCuotasOptions = useMemo(() => {
    return cronograma.filter(c => !c.pagado);
  }, [cronograma]);

  const pendingActsOptions = useMemo(() => {
    return inscripciones.filter(ins => {
      const costo = ins.actividad?.costo || 0;
      const validIngresos = ins.ingreso ? ins.ingreso.filter(ing => ing.estado !== 'devolucion') : [];
      const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
      return totalPaid < costo && costo > 0;
    });
  }, [inscripciones]);
  // ─── Export data ────────────────────────────────────────────────
  const exportCuotas = filteredCuotas.map(c => ({
    Periodo: c.mes,
    Monto: c.pagado ? c.monto_pagado : c.monto_esperado,
    Estado: c.pagado ? 'Pagada' : 'Pendiente'
  }));

  // ─── Reporte Pago Handlers ─────────────────────────────────────
  const handleReportPagoItem = (type, conceptId) => {
    setConceptType(type);
    setSelectedConcept(conceptId);
    setSelectedQrId('');
    setSelectedFile(null);
    setFilePreview(null);
    setReportNotes('');
    setFechaTransferencia(new Date().toISOString().split('T')[0]);

    if (type === 'cuota') {
      const selected = pendingCuotasOptions.find(c => c.mes === conceptId);
      if (selected) {
        setReportAmount(String(selected.monto_esperado));
      } else {
        setReportAmount('');
      }
    } else {
      const selected = pendingActsOptions.find(ins => ins.id === conceptId);
      if (selected) {
        const costo = selected.actividad?.costo || 0;
        const validIngresos = selected.ingreso ? selected.ingreso.filter(ing => ing.estado !== 'devolucion') : [];
        const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
        setReportAmount(String(costo - totalPaid));
      } else {
        setReportAmount('');
      }
    }
    setIsReportModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setToast({ open: true, type: 'error', text: 'El comprobante debe ser una imagen o PDF.' });
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null); // PDF preview simple
      }
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConcept) {
      setToast({ open: true, type: 'error', text: 'Debe seleccionar el periodo o actividad a pagar.' });
      return;
    }
    if (!reportAmount || Number(reportAmount) <= 0) {
      setToast({ open: true, type: 'error', text: 'El monto debe ser mayor a 0.' });
      return;
    }
    if (!selectedFile) {
      setToast({ open: true, type: 'error', text: 'El comprobante de pago es obligatorio.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('Registrando reporte de pago y subiendo comprobante...');

    try {
      // 1. Subir comprobante a Cloudinary
      const comprobanteUrl = await cloudinaryService.uploadFile(selectedFile, 'ingresos');

      // 2. Determinar tipo de ingreso ID de forma inteligente
      const tipos = await finanzasApi.obtenerTiposIngreso();
      let tipoIngresoId = null;

      if (conceptType === 'cuota') {
        const cuotaTipo = tipos.find(t => 
          t.nombre === 'Membresía Ordinaria' || 
          t.nombre === 'Cuota Mensual' || 
          t.nombre.toLowerCase().includes('cuota')
        );
        tipoIngresoId = cuotaTipo?.id || tipos[0]?.id;
      } else {
        const actTipo = tipos.find(t => t.nombre.toLowerCase().includes('actividad') || t.nombre.toLowerCase().includes('curso'));
        tipoIngresoId = actTipo?.id || tipos[0]?.id;
      }

      // 3. Generar descripción
      let descFinal = reportNotes.trim();
      const prependedDesc = conceptType === 'cuota'
        ? `Reporte de cuota: ${selectedConcept}.`
        : `Reporte de actividad pendiente.`;
      
      descFinal = descFinal ? `${prependedDesc} Nota: ${descFinal}` : prependedDesc;

      // 4. Crear el registro en ingreso con estado 'pendiente'
      await finanzasApi.registrarPago({
        miembroId: user.id,
        registradoPor: null, // Sin aprobar aún
        tipo_ingreso_id: tipoIngresoId,
        monto: Number(reportAmount),
        descripcion: descFinal,
        fecha: fechaTransferencia,
        estado: 'pendiente', // Reportado, pendiente de aprobación
        comprobanteUrl,
        inscripcionId: conceptType === 'actividad' ? selectedConcept : null,
        qr_id: selectedQrId || null
      });

      setToast({ open: true, type: 'success', text: '¡Reporte de pago enviado correctamente! Queda pendiente de aprobación del administrador.' });
      setIsReportModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error al reportar pago:", err);
      setToast({ open: true, type: 'error', text: err.message || 'No se pudo registrar el reporte de pago.' });
    } finally {
      setIsSubmitting(false);
      setSubmitMessage('');
    }
  };

  const isLoading = loadingCuotas || loadingActs;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Estado de Cuenta</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Historial completo de tus cuotas, actividades y deudas pendientes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <ExportButtons 
            data={exportCuotas} 
            filename="estado_de_cuenta_cuotas" 
            title={`Reporte de Cuotas - ${user?.nombre || 'Socio'}`} 
            customLabel="Descargar Cuotas"
          />
        </div>
      </header>

      {/* ── KPI Summary Cards ────────────────────────────────────── */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Cuotas Pendientes */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm group hover:shadow-md transition-shadow">
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Cuotas Pendientes</p>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalPendienteCuotas)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{cuotasPendientes.length} cuota{cuotasPendientes.length !== 1 ? 's' : ''} por pagar</p>
            </div>
          </div>

          {/* Cursos Pendientes */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm group hover:shadow-md transition-shadow">
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Cursos Pendientes</p>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalPendienteActs)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{actsPendientes.length} inscripción{actsPendientes.length !== 1 ? 'es' : ''} por pagar</p>
            </div>
          </div>

          {/* Deuda Global Consolidada */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm group hover:shadow-md transition-shadow">
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Deuda Consolidada</p>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(deudaGlobalTotal)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Cuotas + Cursos pendientes</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Sección 1: Historial de Cuotas ─────────────────────── */}
      <section className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Historial de Cuotas</h2>
              <span className="ml-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {cronograma.length} total
              </span>
            </div>

            {!loadingCuotas && cronograma.length > 0 && (
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold shrink-0 shadow-sm border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => { setFiltroEstadoCuotas('todas'); setPageCuotas(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstadoCuotas === 'todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroEstadoCuotas('pendientes'); setPageCuotas(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstadoCuotas === 'pendientes' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
                >
                  Deudas
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroEstadoCuotas('pagadas'); setPageCuotas(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstadoCuotas === 'pagadas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-500'}`}
                >
                  Pagadas
                </button>
              </div>
            )}
          </div>

          {!loadingCuotas && cronograma.length > 0 && (
            <div className="relative w-full sm:max-w-xs xl:ml-auto">
              <input
                type="text"
                placeholder="Buscar por periodo, estado..."
                value={searchCuotas}
                onChange={(e) => { setSearchCuotas(e.target.value); setPageCuotas(1); }}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}
        </div>

        {loadingCuotas ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Spinner />
            <span className="ml-2 text-sm">Cargando cuotas...</span>
          </div>
        ) : (
          <>
            <Table columns={cuotasColumns} rows={cuotasRows} emptyMessage={searchCuotas ? "No se encontraron cuotas para tu búsqueda." : "No tienes cuotas generadas aún."} />
            <Pagination 
              current={pageCuotas} 
              total={totalPagesCuotas} 
              onPageChange={setPageCuotas} 
              filteredCount={filteredCuotas.length}
              label="cuotas"
            />
          </>
        )}
      </section>

      {/* ── Sección 2: Historial de Actividades ────────────────── */}
      <section className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Historial de Actividades</h2>
            </div>
            {!loadingActs && inscripciones.length > 0 && (
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold shadow-inner">
                <button
                  type="button"
                  onClick={() => { setFiltroEstadoActs('todas'); setPageActs(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstadoActs === 'todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroEstadoActs('pendientes'); setPageActs(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstadoActs === 'pendientes' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
                >
                  Deudas
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroEstadoActs('pagadas'); setPageActs(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstadoActs === 'pagadas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-500'}`}
                >
                  Pagadas
                </button>
              </div>
            )}
          </div>

          {!loadingActs && inscripciones.length > 0 && (
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Buscar por actividad, estado..."
                value={searchActs}
                onChange={(e) => { setSearchActs(e.target.value); setPageActs(1); }}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}
        </div>

        {loadingActs ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Spinner />
            <span className="ml-2 text-sm">Cargando actividades...</span>
          </div>
        ) : (
          <>
            <Table columns={actsColumns} rows={actsRows} emptyMessage={searchActs ? "No se encontraron actividades para tu búsqueda." : "No te has inscrito en ninguna actividad."} />
            <Pagination 
              current={pageActs} 
              total={totalPagesActs} 
              onPageChange={setPageActs} 
              filteredCount={filteredActs.length}
              label="inscripciones"
            />
          </>
        )}
      </section>

      {/* ── Modal Reportar Pago ──────────────────────────────── */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => !isSubmitting && setIsReportModalOpen(false)}
        title="Reportar Transferencia / Pago Realizado"
        size="md"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4 p-1">
          {/* Los campos de Tipo, Concepto, Monto y Fecha se llenan automáticamente al hacer clic en 'Reportar Pago' y se envían del estado del componente */}

          {/* Selector de código QR oficial */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Código QR Oficial Utilizado (Opcional)</label>
            <select
              value={selectedQrId}
              onChange={(e) => setSelectedQrId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={isSubmitting}
            >
              <option value="">-- Seleccionar QR de pago --</option>
              {filteredActiveQrs.map(q => (
                <option key={q.id} value={q.id}>{q.nombre}</option>
              ))}
            </select>
            {selectedQrId && filteredActiveQrs.find(q => q.id === selectedQrId)?.url_qr && (
              <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 border rounded-lg max-w-xs">
                <img
                  src={filteredActiveQrs.find(q => q.id === selectedQrId).url_qr}
                  alt="QR Oficial"
                  className="h-16 w-16 object-contain mix-blend-multiply cursor-zoom-in"
                  onClick={() => setImageModal({ open: true, url: filteredActiveQrs.find(q => q.id === selectedQrId).url_qr })}
                />
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 block">QR Seleccionado</span>
                  Haz clic en la imagen si deseas ampliar el código QR oficial.
                </div>
              </div>
            )}
          </div>

          {/* Carga del comprobante */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700">Comprobante de Pago (Imagen / PDF) <span className="text-red-500">*</span></span>
            <div className="flex gap-4 items-center">
              <div className="w-24 h-24 bg-slate-50 border rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Upload className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg shadow-sm text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  Subir Comprobante
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </label>
                <p className="text-[10px] text-slate-400">
                  {selectedFile ? `Archivo: ${selectedFile.name}` : 'Sube la captura de pantalla o recibo bancario.'}
                </p>
              </div>
            </div>
          </div>

          {/* Notas */}
          <Input
            label="Notas / Observaciones (Opcional)"
            placeholder="Ej. Transferencia Banco Unión nro. 12345"
            value={reportNotes}
            onChange={(e) => setReportNotes(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? submitMessage : 'Enviar Reporte'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Zoom QR */}
      <Modal
        isOpen={imageModal.open}
        onClose={() => setImageModal({ open: false, url: null })}
        title="Código QR Oficial"
        size="sm"
      >
        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl">
          {imageModal.url && (
            <img
              src={imageModal.url}
              alt="QR Oficial"
              className="max-h-[60vh] object-contain rounded-xl"
            />
          )}
        </div>
      </Modal>

      {/* Modal Motivo Rechazo */}
      <Modal
        isOpen={motivoRechazoModal.open}
        onClose={() => setMotivoRechazoModal({ open: false, motivo: '' })}
        title="Detalle de Rechazo de Pago"
        width="max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-800 space-y-2">
            <span className="font-extrabold uppercase block text-red-700">Motivo del Rechazo:</span>
            <p className="font-medium text-slate-700 whitespace-pre-wrap leading-relaxed text-sm bg-white p-3 rounded-lg border">
              {motivoRechazoModal.motivo}
            </p>
          </div>
          <p className="text-xs text-slate-500 text-center leading-normal">
            Por favor, vuelve a reportar el pago subiendo un nuevo comprobante válido o corrigiendo la información indicada.
          </p>
          <div className="flex justify-end pt-2 border-t">
            <Button
              type="button"
              onClick={() => setMotivoRechazoModal({ open: false, motivo: '' })}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      {/* Overlay de carga */}
      {isSubmitting && <LoadingOverlay text={submitMessage} />}

      {/* Toast notifications */}
      {toast.open && (
        <Toast
          type={toast.type}
          text={toast.text}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
};
