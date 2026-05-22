import { useEffect, useState, useMemo } from 'react';
import { 
  CreditCard, Search, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, GraduationCap, Clock,
  Wallet, TrendingDown, BookOpen, Calendar
} from 'lucide-react';
import { finanzasApi } from '../../finanzas/api';
import { academicoApi } from '../../academico/api';
import { useAuthStore } from '../../../store/authStore';
import { Table } from '../../../components/data-display';
import { Spinner, ExportButtons } from '../../../components/ui';
import { supabase } from '../../../services/supabase';

export const EstadoCuentaSocioPage = () => {
  const { user } = useAuthStore();

  // ─── Cuotas state ───────────────────────────────────────────────
  const [cuotasData, setCuotasData] = useState(null); // { cronograma, mesesPagados, mesesDeuda }
  const [loadingCuotas, setLoadingCuotas] = useState(true);
  const [searchCuotas, setSearchCuotas] = useState('');
  const [pageCuotas, setPageCuotas] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas', 'pendientes', 'pagadas'

  // ─── Actividades state ──────────────────────────────────────────
  const [inscripciones, setInscripciones] = useState([]);
  const [loadingActs, setLoadingActs] = useState(true);
  const [searchActs, setSearchActs] = useState('');
  const [pageActs, setPageActs] = useState(1);

  const ITEMS_PER_PAGE = 10;

  // ─── Carga de cuotas del usuario ────────────────────────────────
  useEffect(() => {
    const fetchCuotas = async () => {
      if (!user?.id) return;
      try {
        const historial = await finanzasApi.obtenerHistorialCuotasMiembro();
        const miRegistro = historial.find(h => h.miembro?.id === user.id);
        if (miRegistro) {
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
    };
    fetchCuotas();
  }, [user]);

  // ─── Carga de inscripciones del usuario ─────────────────────────
  useEffect(() => {
    const fetchInscripciones = async () => {
      if (!user?.id) return;
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
            )
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
    };
    fetchInscripciones();
  }, [user]);

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
  const cronogramaRaw = cuotasData?.cronograma || [];
  const cronograma = useMemo(() => {
    return [...cronogramaRaw].sort((a, b) => {
      if (a.pagado === b.pagado) return 0;
      return a.pagado ? 1 : -1; // Deuda de primero, pagadas al final
    });
  }, [cronogramaRaw]);

  const filteredCuotas = useMemo(() => {
    let list = cronograma;
    if (filtroEstado === 'pendientes') {
      list = list.filter(c => !c.pagado);
    } else if (filtroEstado === 'pagadas') {
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
  }, [cronograma, filtroEstado, searchCuotas]);

  const totalPagesCuotas = Math.ceil(filteredCuotas.length / ITEMS_PER_PAGE);
  const paginatedCuotas = filteredCuotas.slice((pageCuotas - 1) * ITEMS_PER_PAGE, pageCuotas * ITEMS_PER_PAGE);

  // ─── Inscripciones filtradas ────────────────────────────────────
  const filteredActs = useMemo(() => {
    if (!searchActs.trim()) return inscripciones;
    const q = searchActs.toLowerCase();
    return inscripciones.filter(i => {
      const titulo = (i.actividad?.titulo || '').toLowerCase();
      const tipo = (i.actividad?.tipo_actividad?.nombre || 'general').toLowerCase();
      const estado = (i.estado || '').toLowerCase();
      return titulo.includes(q) || tipo.includes(q) || estado.includes(q);
    });
  }, [inscripciones, searchActs]);

  const totalPagesActs = Math.ceil(filteredActs.length / ITEMS_PER_PAGE);
  const paginatedActs = filteredActs.slice((pageActs - 1) * ITEMS_PER_PAGE, pageActs * ITEMS_PER_PAGE);

  // ─── KPI totals ─────────────────────────────────────────────────
  const cuotasPagadas = cronograma.filter(c => c.pagado);
  const cuotasPendientes = cronograma.filter(c => !c.pagado);
  const totalPagadoCuotas = cuotasPagadas.reduce((sum, c) => sum + Number(c.monto_pagado || 0), 0);
  const totalPendienteCuotas = cuotasPendientes.reduce((sum, c) => sum + Number(c.monto_esperado || 0), 0);

  const actsPagadas = inscripciones.filter(i => i.estado === 'pagado');
  const actsPendientes = inscripciones.filter(i => i.estado !== 'pagado');
  const totalPagadoActs = actsPagadas.reduce((sum, i) => sum + Number(i.actividad?.costo || 0), 0);
  const totalPendienteActs = actsPendientes.reduce((sum, i) => sum + Number(i.actividad?.costo || 0), 0);

  const deudaGlobalTotal = totalPendienteCuotas + totalPendienteActs;

  // ─── Columns cuotas ─────────────────────────────────────────────
  const cuotasColumns = [
    { key: 'periodo', label: 'Periodo' },
    { key: 'fecha_generacion', label: 'Fecha Generación' },
    { key: 'monto_display', label: 'Monto' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const cuotasRows = paginatedCuotas.map((c, idx) => ({
    id: c.mes + '-' + ((pageCuotas - 1) * ITEMS_PER_PAGE + idx),
    periodo: (
      <span className="font-semibold text-slate-800 text-sm">{c.mes}</span>
    ),
    fecha_generacion: (
      <span className="text-sm text-slate-600">{formatDate(c.fechaGeneracion)}</span>
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
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-700">
        <AlertCircle className="h-3 w-3" /> PENDIENTE
      </span>
    ),
  }));

  // ─── Columns actividades ────────────────────────────────────────
  const actsColumns = [
    { key: 'actividad', label: 'Actividad' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'fecha_inscripcion_display', label: 'Inscripción' },
    { key: 'costo_display', label: 'Costo' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const actsRows = paginatedActs.map((ins, idx) => ({
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
    tipo: (
      <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
        {ins.actividad?.tipo_actividad?.nombre || 'General'}
      </span>
    ),
    fecha_inscripcion_display: (
      <span className="text-sm text-slate-600">{formatDate(ins.fecha_inscripcion)}</span>
    ),
    costo_display: (
      <span className={`font-bold text-sm ${Number(ins.actividad?.costo || 0) > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
        {formatCurrency(ins.actividad?.costo || 0)}
      </span>
    ),
    estado_display: ins.estado === 'pagado' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> PAGADO
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
        <Clock className="h-3 w-3" /> PENDIENTE
      </span>
    ),
  }));

  // ─── Export data ────────────────────────────────────────────────
  const exportCuotas = filteredCuotas.map(c => ({
    Periodo: c.mes,
    'Fecha Generación': c.fechaGeneracion,
    Monto: c.pagado ? c.monto_pagado : c.monto_esperado,
    Estado: c.pagado ? 'Pagada' : 'Pendiente'
  }));

  const exportActs = filteredActs.map(i => ({
    Actividad: i.actividad?.titulo || 'Sin nombre',
    Tipo: i.actividad?.tipo_actividad?.nombre || 'General',
    'Fecha Inscripción': i.fecha_inscripcion,
    Costo: i.actividad?.costo || 0,
    Estado: i.estado === 'pagado' ? 'Pagado' : 'Pendiente'
  }));

  // ─── Pagination component ──────────────────────────────────────
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

  const isLoading = loadingCuotas || loadingActs;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Estado de Cuenta</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Historial completo de tus cuotas, actividades y deudas pendientes.</p>
        </div>
        <ExportButtons 
          data={[...exportCuotas.map(e => ({ ...e, Tipo: 'Cuota' })), ...exportActs.map(e => ({ ...e, Origen: 'Actividad' }))]} 
          filename="estado_de_cuenta" 
          title={`Estado de Cuenta - ${user?.nombre || 'Socio'}`} 
        />
      </header>

      {/* ── KPI Summary Cards ────────────────────────────────────── */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Cuotas Pendientes */}
          <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm group hover:shadow-md transition-shadow">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-red-100/40 blur-xl group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Cuotas Pendientes</p>
              </div>
              <p className="text-xl font-black text-red-700">{formatCurrency(totalPendienteCuotas)}</p>
              <p className="text-[10px] text-red-500 mt-0.5">{cuotasPendientes.length} cuota{cuotasPendientes.length !== 1 ? 's' : ''} por pagar</p>
            </div>
          </div>

          {/* Cursos Pendientes */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm group hover:shadow-md transition-shadow">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-indigo-100/40 blur-xl group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Cursos Pendientes</p>
              </div>
              <p className="text-xl font-black text-indigo-700">{formatCurrency(totalPendienteActs)}</p>
              <p className="text-[10px] text-indigo-500 mt-0.5">{actsPendientes.length} inscripción{actsPendientes.length !== 1 ? 'es' : ''} por pagar</p>
            </div>
          </div>

          {/* Deuda Global Consolidada */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm group hover:shadow-md transition-shadow">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-amber-100/40 blur-xl group-hover:scale-110 transition-transform" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Deuda Total</p>
              </div>
              <p className="text-xl font-black text-amber-700">{formatCurrency(deudaGlobalTotal)}</p>
              <p className="text-[10px] text-amber-500 mt-0.5">Cuotas + Cursos pendientes</p>
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
                  onClick={() => { setFiltroEstado('todas'); setPageCuotas(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstado === 'todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroEstado('pendientes'); setPageCuotas(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstado === 'pendientes' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
                >
                  Deudas
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroEstado('pagadas'); setPageCuotas(1); }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${filtroEstado === 'pagadas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-500'}`}
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Historial de Actividades</h2>
            <span className="ml-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {inscripciones.length} inscripciones
            </span>
          </div>

          {!loadingActs && inscripciones.length > 0 && (
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Buscar por actividad, tipo, estado..."
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
    </div>
  );
};
