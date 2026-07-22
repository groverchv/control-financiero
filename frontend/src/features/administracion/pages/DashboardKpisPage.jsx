import { useState, useEffect, useMemo } from 'react';
import {
  Landmark, Receipt, Banknote, Scale, CircleDollarSign,
  UsersRound, UserCheck, UserX, GraduationCap, CalendarCheck, BookOpenCheck,
  Package, Warehouse, ClipboardList,
  CheckCircle, AlertTriangle, Clock
} from 'lucide-react';
import { useKpiData } from '../hooks';
import { useActivos } from '../../patrimonio/hooks';
import { usePagos, useEgresos } from '../../finanzas/hooks';
import { useActividades } from '../../academico/hooks';
import { administracionApi } from '../api';
import { finanzasApi } from '../../finanzas/api';
import { supabase } from '../../../services/supabase';
import { ExportButtons, Skeleton } from '../../../components/ui';

// ─── Formato monetario ───────────────────────────────────────────────────────
const fmt = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Mini donut SVG ──────────────────────────────────────────────────────────
const Donut = ({ value = 0, size = 56, stroke = 5, color = '#3b82f6' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - (circ * pct) / 100}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="fill-slate-700 text-[11px] font-black">
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = 'blue', trend }) => {
  const bg = { blue: 'bg-blue-50', emerald: 'bg-emerald-50', purple: 'bg-purple-50', amber: 'bg-amber-50', rose: 'bg-rose-50', indigo: 'bg-indigo-50' }[color] || 'bg-blue-50';
  const tc = { blue: 'text-blue-600', emerald: 'text-emerald-600', purple: 'text-purple-600', amber: 'text-amber-600', rose: 'text-rose-600', indigo: 'text-indigo-600' }[color] || 'text-blue-600';
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${tc}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-base sm:text-xl font-extrabold text-slate-900 mt-0.5 break-words sm:truncate">{value}</p>
        {sub && <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, color = 'blue', desc }) => {
  const tc = { blue: 'text-blue-600', emerald: 'text-emerald-600', purple: 'text-purple-600', amber: 'text-amber-600', indigo: 'text-indigo-600' }[color] || 'text-blue-600';
  const bgc = { blue: 'bg-blue-50/50 border-blue-100 box-blue', emerald: 'bg-emerald-50/50 border-emerald-100 box-emerald', purple: 'bg-purple-50/50 border-purple-100 box-purple', amber: 'bg-amber-50/50 border-amber-100 box-amber', indigo: 'bg-indigo-50/50 border-indigo-100 box-indigo' }[color] || 'bg-blue-50/50 border-blue-100 box-blue';
  return (
    <div className={`p-3 sm:p-4 rounded-2xl border ${bgc} flex items-start gap-3`}>
      <div className={`p-1.5 sm:p-2 rounded-xl bg-white section-header-icon shadow-sm shrink-0`}>
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${tc}`} />
      </div>
      <div>
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">{title}</h2>
        {desc && <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
export const DashboardKpisPage = () => {
  const { kpis, loading: loadingKpis } = useKpiData();
  const { cuotas: ingresosReales, loading: loadingIngresos } = usePagos(null);
  const { egresos: egresosReales, loading: loadingEgresos } = useEgresos();
  const { activos, loading: loadingActivos } = useActivos();
  const { actividades, loading: loadingActividades } = useActividades();

  const [activeTab, setActiveTab] = useState('financiero');
  const [quarterFilter, setQuarterFilter] = useState('ALL');
  const [todosMiembros, setTodosMiembros] = useState([]);
  const [, setLoadingMiembros] = useState(true);
  const [amortPendientes, setAmortPendientes] = useState(0);

  const [cuotasPendientesTotal, setCuotasPendientesTotal] = useState(0);
  const [cursosPendientesTotal, setCursosPendientesTotal] = useState(0);
  const [cursosPagadosTotal, setCursosPagadosTotal] = useState(0);
  const [loadingPendientes, setLoadingPendientes] = useState(true);

  // Fetch pending dues and unpaid/paid courses
  useEffect(() => {
    let cancelled = false;
    const loadPendientes = async () => {
      try {
        setLoadingPendientes(true);
        
        // 1. Fetch pending cuotas
        const fetchCuotas = async () => {
          try {
            const res = await finanzasApi.obtenerHistorialCuotasMiembro();
            let total = 0;
            res.forEach(item => {
              if (item.cronograma) {
                item.cronograma.forEach(c => {
                  if (!c.pagado) {
                    total += Number(c.monto_esperado || 0);
                  }
                });
              }
            });
            return total;
          } catch (err) {
            console.error('Error fetching cuotas pendientes:', err);
            return 0;
          }
        };

        // 2. Fetch pending courses/activities
        const fetchCursos = async () => {
          try {
            const { data, error } = await supabase
              .from('inscripcion')
              .select('id, estado, actividad:actividad_id(id, costo)')
              .neq('estado', 'pagado');
            
            if (error) throw error;

            let total = 0;
            (data || []).forEach(i => {
              if (i.actividad && Number(i.actividad.costo) > 0) {
                total += Number(i.actividad.costo);
              }
            });
            return total;
          } catch (err) {
            console.error('Error fetching cursos pendientes:', err);
            return 0;
          }
        };

        // 3. Fetch paid courses/activities (Ingresos extras por actividades)
        const fetchCursosPagados = async () => {
          try {
            const { data, error } = await supabase
              .from('ingreso')
              .select('monto, estado, inscripcion_id')
              .not('inscripcion_id', 'is', null)
              .neq('estado', 'devolucion');
            
            if (error) throw error;

            let total = 0;
            (data || []).forEach(i => {
              total += Number(i.monto);
            });
            return total;
          } catch (err) {
            console.error('Error fetching cursos pagados:', err);
            return 0;
          }
        };

        const [cuotasTotal, cursosTotal, cursosPagadosVal] = await Promise.all([
          fetchCuotas(),
          fetchCursos(),
          fetchCursosPagados()
        ]);

        if (!cancelled) {
          setCuotasPendientesTotal(cuotasTotal);
          setCursosPendientesTotal(cursosTotal);
          setCursosPagadosTotal(cursosPagadosVal);
          setLoadingPendientes(false);
        }
      } catch (err) {
        console.error('Error loading pending financial data:', err);
        if (!cancelled) {
          setLoadingPendientes(false);
        }
      }
    };

    loadPendientes();
    return () => { cancelled = true; };
  }, []);

  // Amortization alerts
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { count } = await supabase
          .from('plan_amortizacion')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pendiente');
        if (!cancelled) setAmortPendientes(count || 0);
      } catch (err) {
        console.error('[DashboardKpis] Error fetching plan_amortizacion count:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch miembros for Gestión de Miembros tab
  useEffect(() => {
    let cancelled = false;
    administracionApi.obtenerMiembros()
      .then(data => {
        if (!cancelled) {
          setTodosMiembros(data || []);
          setLoadingMiembros(false);
        }
      })
      .catch(err => {
        console.error('Error fetching members:', err);
        if (!cancelled) setLoadingMiembros(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ─── Computed financial data ─────────────────────────────────────────────
  const allI = useMemo(() => ingresosReales || [], [ingresosReales]);
  const allE = useMemo(() => egresosReales || [], [egresosReales]);

  const selectedYear = useMemo(() => {
    const dates = [...allI.map(i => i.fecha || i.creacion), ...allE.map(e => e.fecha || e.creacion)].filter(Boolean);
    return dates.length > 0 ? Math.max(...dates.map(d => new Date(d).getFullYear())) : new Date().getFullYear();
  }, [allI, allE]);

  const filterQ = (items, q, y) => items.filter(it => {
    const d = new Date(it.fecha || it.creacion);
    if (d.getFullYear() !== y) return false;
    if (q === 'ALL') return true;
    const m = d.getMonth();
    return q === 'Q1' ? m <= 2 : q === 'Q2' ? m >= 3 && m <= 5 : q === 'Q3' ? m >= 6 && m <= 8 : m >= 9;
  });

  const fI = useMemo(() => filterQ(allI.filter(i => i.estado !== 'devolucion'), quarterFilter, selectedYear), [allI, quarterFilter, selectedYear]);
  const fE = useMemo(() => filterQ(allE, quarterFilter, selectedYear), [allE, quarterFilter, selectedYear]);

  const totalI = fI.reduce((s, x) => s + Number(x.monto || 0), 0);
  const totalE = fE.reduce((s, x) => s + Number(x.monto || 0), 0);
  const saldo = totalI - totalE;
  const margenSuperavit = totalI > 0 ? ((saldo / totalI) * 100).toFixed(1) : '0.0';
  const eficienciaOp = totalI > 0 ? (100 - (totalE / totalI) * 100).toFixed(1) : '100.0';

  // Morosidad
  const validIForTasa = useMemo(() => allI.filter(i => i.estado !== 'devolucion'), [allI]);
  const ingPendientes = validIForTasa.filter(i => i.estado === 'pendiente').length;
  const ingPagados = validIForTasa.filter(i => i.estado === 'pagada').length;
  const tasaCobro = validIForTasa.length > 0 ? ((ingPagados / validIForTasa.length) * 100).toFixed(0) : '100';

  // Patrimonio
  const totalActivos = (activos || []).length;
  const valorPatrimonio = (activos || []).reduce((s, a) => s + Number(a.costo_total || 0), 0);
  const totalDeudaActivos = (activos || []).reduce((sum, a) => sum + Number(a.saldo_pendiente || 0), 0);
  const totalPagadoActivos = Math.max(0, valorPatrimonio - totalDeudaActivos);
  const activosOperativos = (activos || []).filter(a => a.estado === 'activo' || a.estado === 'pagado').length;

  // Académico
  const totalActividades = (actividades || []).length;
  const actividadesActivas = (actividades || []).filter(a => a.estado === 'activo' || a.estado === 'programado').length;



  // dynamic professions calculation
  const professionsMap = useMemo(() => {
    const counts = {};
    todosMiembros.forEach(m => {
      const p = m.profesion || 'Sin especificar';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [todosMiembros]);

  // Global loading
  const isLoading = loadingKpis || loadingIngresos || loadingEgresos || loadingActivos || loadingActividades;

  const quarters = [
    { key: 'ALL', label: 'Anual' },
    { key: 'Q1', label: 'T1' },
    { key: 'Q2', label: 'T2' },
    { key: 'Q3', label: 'T3' },
    { key: 'Q4', label: 'T4' }
  ];

  // Export data
  const exportData = [
    { 'Métrica / Indicador': 'Ingresos Totales', 'Valor Calculado': fmt(totalI) },
    { 'Métrica / Indicador': 'Egresos Realizados', 'Valor Calculado': fmt(totalE) },
    { 'Métrica / Indicador': 'Saldo Neto Disponible', 'Valor Calculado': fmt(saldo) },
    { 'Métrica / Indicador': 'Margen de Superávit', 'Valor Calculado': `${margenSuperavit}%` },
    { 'Métrica / Indicador': 'Eficiencia Operativa', 'Valor Calculado': `${eficienciaOp}%` },
    { 'Métrica / Indicador': 'Tasa de Cobro', 'Valor Calculado': `${tasaCobro}%` },
    { 'Métrica / Indicador': 'Miembros Activos', 'Valor Calculado': kpis?.miembrosActivos || 0 },
    { 'Métrica / Indicador': 'Miembros Inactivos', 'Valor Calculado': kpis?.miembrosInactivos || 0 },
    { 'Métrica / Indicador': 'Tasa de Retención', 'Valor Calculado': `${kpis?.tasaRetention || 0}%` },
    { 'Métrica / Indicador': 'Activos Patrimoniales', 'Valor Calculado': totalActivos },
    { 'Métrica / Indicador': 'Valor Patrimonial', 'Valor Calculado': fmt(valorPatrimonio) },
    { 'Métrica / Indicador': 'Actividades Académicas', 'Valor Calculado': totalActividades },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        {/* ─── Header ─── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Consola de Inteligencia Financiera
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Cargando consola de inteligencia financiera…
            </p>
          </div>
        </div>

        {/* ─── Tabs Navigation Skeleton ─── */}
        <div className="grid grid-cols-4 gap-2 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-slate-200/50 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* ─── Skeletons for KPIs ─── */}
        <div className="space-y-6">
          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton variant="kpi" />
            <Skeleton variant="kpi" />
            <Skeleton variant="kpi" />
            <Skeleton variant="kpi" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 lg:col-span-2 h-48 animate-pulse bg-slate-50" />
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 h-48 animate-pulse bg-slate-50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Consola de Inteligencia Financiera
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión consolidada del ejercicio fiscal {selectedYear} · Soporte integral para la toma de decisiones
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quarter filter */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-bold border border-slate-200">
            {quarters.map(q => (
              <button key={q.key}
                onClick={() => setQuarterFilter(q.key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  quarterFilter === q.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <ExportButtons data={exportData} filename={`kpis_${selectedYear}`} />
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
        {[
          { id: 'financiero', label: 'Indicadores Financieros', icon: Landmark, color: 'blue' },
          { id: 'academica', label: 'Gestión Académica', icon: GraduationCap, color: 'emerald' },
          { id: 'miembros', label: 'Gestión de Miembros', icon: UsersRound, color: 'purple' },
          { id: 'patrimonial', label: 'Control Patrimonial', icon: Warehouse, color: 'amber' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const btnActive = {
            blue: 'bg-white text-blue-600 shadow-sm border border-slate-200/50 scale-105',
            purple: 'bg-white text-purple-600 shadow-sm border border-slate-200/50 scale-105',
            amber: 'bg-white text-amber-600 shadow-sm border border-slate-200/50 scale-105',
            emerald: 'bg-white text-emerald-600 shadow-sm border border-slate-200/50 scale-105',
            indigo: 'bg-white text-indigo-600 shadow-sm border border-slate-200/50 scale-105'
          }[tab.color];
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 ${
                isActive ? btnActive : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? '' : 'text-slate-400'}`} />
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content Views ─── */}
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* VIEW 1: INDICADORES FINANCIEROS */}
        {activeTab === 'financiero' && (
          <div className="space-y-6">
            <SectionHeader 
              icon={Landmark} 
              title="Indicadores Financieros y Gestión de Caja" 
              color="blue"
              desc="Supervisión detallada de ingresos, egresos, ratios de liquidez y eficiencia operativa institucional."
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Receipt} label="Ingresos Totales" value={fmt(totalI)} sub={`${fI.length} transacciones`} color="emerald" />
              <KpiCard icon={Banknote} label="Egresos Realizados" value={fmt(totalE)} sub={`${fE.length} operaciones`} color="rose" />
              <KpiCard icon={CircleDollarSign} label="Saldo Neto Disponible" value={fmt(saldo)} sub={saldo >= 0 ? 'Superávit' : 'Déficit'} color={saldo >= 0 ? 'blue' : 'rose'} />
              <KpiCard icon={Scale} label="Margen de Superávit" value={`${margenSuperavit}%`} sub="Ing. neto / Ing. total" color="indigo" />
            </div>

            {/* Cash Flow Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dynamic comparative bar chart */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 lg:col-span-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distribución Consolidada de Caja</h3>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-600">
                      <span>Ingresos Fiscales</span>
                      <span className="text-emerald-600 font-extrabold">{fmt(totalI)} ({totalI > 0 ? '100' : '0'}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${totalI > 0 ? 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-600">
                      <span>Egresos Operativos</span>
                      <span className="text-rose-600 font-extrabold">
                        {fmt(totalE)} ({totalI > 0 ? ((totalE / totalI) * 100).toFixed(0) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${totalI > 0 ? Math.min(100, (totalE / totalI) * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-600">
                      <span>Superávit Disponible</span>
                      <span className="text-blue-600 font-extrabold">
                        {fmt(saldo)} ({totalI > 0 ? ((saldo / totalI) * 100).toFixed(0) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${totalI > 0 && saldo > 0 ? ((saldo / totalI) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ratios Donut widgets */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eficiencia Operacional</h3>
                <div className="flex items-center gap-4 pt-2">
                  <Donut value={Number(eficienciaOp)} color="#3b82f6" size={70} stroke={7} />
                  <div>
                    <p className="text-sm font-black text-slate-800">{eficienciaOp}%</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Capacidad de Ahorro</p>
                    <p className="text-[11px] text-slate-500 mt-1">Margen libre tras cubrir costes operativos.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                  <Donut value={Number(tasaCobro)} color="#10b981" size={70} stroke={7} />
                  <div>
                    <p className="text-sm font-black text-slate-800">{tasaCobro}%</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tasa de Cobro</p>
                    <p className="text-[11px] text-slate-500 mt-1">{ingPendientes} cobros aún pendientes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pendientes de Cobro y Compromisos de Pago */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldos de Gestión y Compromisos de Pago</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Resumen analítico de saldos recaudados y cuentas por cobrar asociadas a membresías, cursos y activos.</p>
                </div>
                {loadingPendientes && (
                  <span className="text-[10px] text-amber-500 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full font-bold animate-pulse">
                    Actualizando saldos...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard 
                  icon={Clock} 
                  label="Membresías por Cobrar" 
                  value={loadingPendientes ? "..." : fmt(cuotasPendientesTotal)} 
                  sub="Cuotas de socios pendientes" 
                  color="amber" 
                />
                <KpiCard 
                  icon={BookOpenCheck} 
                  label="Cursos por Cobrar" 
                  value={loadingPendientes ? "..." : fmt(cursosPendientesTotal)} 
                  sub="Inscripciones pendientes" 
                  color="indigo" 
                />
                <KpiCard 
                  icon={GraduationCap} 
                  label="Ingresos Extras (Actividades)" 
                  value={loadingPendientes ? "..." : fmt(cursosPagadosTotal)} 
                  sub="Monto total cobrado" 
                  color="emerald" 
                />
                <KpiCard 
                  icon={AlertTriangle} 
                  label="Activos - Pendiente" 
                  value={fmt(totalDeudaActivos)} 
                  sub="Saldo restante por pagar" 
                  color="rose" 
                />
                <KpiCard 
                  icon={CheckCircle} 
                  label="Activos - Cancelado" 
                  value={fmt(totalPagadoActivos)} 
                  sub="Monto total ya pagado" 
                  color="blue" 
                />
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: GESTIÓN DE MIEMBROS */}
        {activeTab === 'miembros' && (
          <div className="space-y-6">
            <SectionHeader 
              icon={UsersRound} 
              title="Gestión y Estado de Miembros" 
              color="purple"
              desc="Estadísticas de retención de asociados, distribución profesional de talentos e histórico de altas."
            />
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={UsersRound} label="Total Miembros" value={kpis?.totalMiembros || 0} sub="Registrados en el sistema" color="purple" />
              <KpiCard icon={UserCheck} label="Miembros Activos" value={kpis?.miembrosActivos || 0} sub="Habilitados" color="emerald" />
              <KpiCard icon={UserX} label="Miembros Inactivos" value={kpis?.miembrosInactivos || 0} sub="Dados de baja" color="rose" />
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                <Donut value={kpis?.tasaRetention || 0} color="#8b5cf6" size={56} />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Retención</p>
                  <p className="text-lg font-extrabold text-slate-900">{kpis?.tasaRetention || 0}%</p>
                  <p className="text-xs text-slate-500">Activos / Total</p>
                </div>
              </div>
            </div>

            {/* Member distribution graphics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* circular metric */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center justify-center text-center space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start">Proporción de Habilitación</h3>
                <div className="relative flex items-center justify-center p-4">
                  <Donut value={kpis?.tasaRetention || 0} color="#a78bfa" size={130} stroke={12} />
                </div>
                <div className="flex gap-6 text-xs font-bold mt-2">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-violet-400" /> {kpis?.miembrosActivos || 0} Activos</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-slate-200" /> {kpis?.miembrosInactivos || 0} Inactivos</span>
                </div>
              </div>

              {/* dynamic list of talent count */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 lg:col-span-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Representación de Talentos y Profesiones</h3>
                <div className="space-y-3 pt-2">
                  {professionsMap.map(([prof, count], idx) => {
                    const pct = Math.round((count / (todosMiembros.length || 1)) * 100);
                    const color = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'][idx] || 'bg-slate-500';
                    return (
                      <div key={prof} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{prof}</span>
                          <span>{count} socio(s) ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {professionsMap.length === 0 && (
                    <p className="text-center py-6 text-slate-400 text-xs">Cargando base de talentos…</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: CONTROL PATRIMONIAL */}
        {activeTab === 'patrimonial' && (
          <div className="space-y-6">
            <SectionHeader 
              icon={Warehouse} 
              title="Control Patrimonial e Inventario de Activos" 
              color="amber"
              desc="Composición financiera del patrimonio físico, cuotas de amortización del capital y pasivos amortizados."
            />
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Package} label="Activos Registrados" value={totalActivos} sub={`${activosOperativos} activos`} color="amber" />
              <KpiCard icon={Landmark} label="Valor Patrimonial" value={fmt(valorPatrimonio)} sub="Costo total de adquisición" color="blue" />
              <KpiCard icon={ClipboardList} label="Cuotas Amortización" value={amortPendientes} sub="Pendientes de pago" color={amortPendientes > 0 ? 'rose' : 'emerald'} />
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                <Donut value={totalActivos > 0 ? (activosOperativos / totalActivos * 100) : 100} color="#f59e0b" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activos Activos</p>
                  <p className="text-lg font-extrabold text-slate-900">
                    {totalActivos > 0 ? Math.round(activosOperativos / totalActivos * 100) : 100}%
                  </p>
                  <p className="text-xs text-slate-500">Operativos / Total</p>
                </div>
              </div>
            </div>

            {/* Activos Fijos - Balance de Capital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KpiCard 
                icon={CheckCircle} 
                label="Monto Pagado de Activos" 
                value={fmt(totalPagadoActivos)} 
                sub="Capital total amortizado y liquidado" 
                color="emerald" 
              />
              <KpiCard 
                icon={AlertTriangle} 
                label="Monto Pendiente de Activos" 
                value={fmt(totalDeudaActivos)} 
                sub="Capital restante por regularizar" 
                color="rose" 
              />
            </div>

            {/* Custom stacked progress visualization (Cost vs. Paid vs. Pending Debt) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Relación de Balance del Patrimonio</h3>
              <div className="space-y-4">
                <div className="flex h-6 rounded-full overflow-hidden shadow-inner bg-slate-100">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full flex items-center justify-center text-[10px] font-black text-white transition-all duration-1000" 
                    style={{ width: `${valorPatrimonio > 0 ? (totalPagadoActivos / valorPatrimonio) * 100 : 0}%` }}
                  >
                    {valorPatrimonio > 0 ? `${Math.round((totalPagadoActivos / valorPatrimonio) * 100)}% PAGADO` : ''}
                  </div>
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-orange-600 h-full flex items-center justify-center text-[10px] font-black text-white transition-all duration-1000" 
                    style={{ width: `${valorPatrimonio > 0 ? (totalDeudaActivos / valorPatrimonio) * 100 : 0}%` }}
                  >
                    {valorPatrimonio > 0 ? `${Math.round((totalDeudaActivos / valorPatrimonio) * 100)}% DEUDA` : ''}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold pt-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-slate-500">Costo Adquisición Total:</span>
                    <span className="text-slate-800 ml-auto">{fmt(valorPatrimonio)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-500">Monto Cancelado:</span>
                    <span className="text-slate-800 ml-auto">{fmt(totalPagadoActivos)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-orange-500 shrink-0" />
                    <span className="text-slate-500">Monto Pendiente:</span>
                    <span className="text-slate-800 ml-auto">{fmt(totalDeudaActivos)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: GESTIÓN ACADÉMICA */}
        {activeTab === 'academica' && (
          <div className="space-y-6">
            <SectionHeader 
              icon={GraduationCap} 
              title="Gestión Académica y Capacitación" 
              color="emerald"
              desc="Supervisión de cursos y eventos académicos, capacidad de estudiantes e índices de finalización."
            />
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={BookOpenCheck} label="Total Actividades" value={totalActividades} sub="Eventos y capacitaciones" color="emerald" />
              <KpiCard icon={CalendarCheck} label="Programadas / Activas" value={actividadesActivas} sub="En curso o planificados" color="blue" />
              <KpiCard icon={GraduationCap} label="Finalizadas" value={totalActividades - actividadesActivas} sub="Completadas con éxito" color="purple" />
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                <Donut value={totalActividades > 0 ? ((totalActividades - actividadesActivas) / totalActividades * 100) : 0} color="#10b981" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Ejecución</p>
                  <p className="text-lg font-extrabold text-slate-900">
                    {totalActividades > 0 ? Math.round((totalActividades - actividadesActivas) / totalActividades * 100) : 0}%
                  </p>
                  <p className="text-xs text-slate-500">Finalizadas / Total</p>
                </div>
              </div>
            </div>

            {/* Finanzas Académicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KpiCard 
                icon={CheckCircle} 
                label="Ingresos Extras por Actividades" 
                value={loadingPendientes ? "..." : fmt(cursosPagadosTotal)} 
                sub="Total recaudado por inscripciones" 
                color="emerald" 
              />
              <KpiCard 
                icon={CircleDollarSign} 
                label="Monto Pendiente por Cobrar de Cursos" 
                value={loadingPendientes ? "..." : fmt(cursosPendientesTotal)} 
                sub="Monto total adeudado por inscripciones a actividades académicas" 
                color="indigo" 
              />
            </div>

            {/* Academic capacity utilization progress widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacidad de Programas Académicos</h3>
                <div className="space-y-3 pt-2">
                  {(actividades || []).slice(0, 3).map(act => {
                    const totalEnrollCount = act.cupos ?? 0;
                    return (
                      <div key={act.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span className="truncate max-w-[180px]">{act.nombre || act.titulo}</span>
                          <span>{totalEnrollCount === 0 ? 'Sin cupos' : `${totalEnrollCount} cupos libres`}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, (totalEnrollCount / 50) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(actividades || []).length === 0 && (
                    <p className="text-center py-4 text-xs text-slate-400">Cargando programas académicos…</p>
                  )}
                </div>
              </div>

              {/* execution status radial widget */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Completitud de Eventos</h3>
                <div className="flex items-center gap-4 mt-2">
                  <Donut value={totalActividades > 0 ? ((totalActividades - actividadesActivas) / totalActividades * 100) : 0} color="#10b981" size={80} stroke={8} />
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {totalActividades - actividadesActivas} finalizadas
                    </p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Hito de Ejecución del Ciclo</p>
                    <p className="text-[11px] text-slate-500 mt-1">Capacitaciones selladas en el cronograma anual.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        
      </div>
    </div>
  );
};
