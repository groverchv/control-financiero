import { useState, useEffect, useMemo } from 'react';
import {
  Landmark, Receipt, Banknote, Scale, Percent, CircleDollarSign,
  UsersRound, UserCheck, UserX, GraduationCap, CalendarCheck, BookOpenCheck,
  Package, Warehouse, ClipboardList, ShieldCheck,
  Gem, Signal, Fingerprint, FileSpreadsheet
} from 'lucide-react';
import { useKpiData } from '../hooks';
import { useActivos } from '../../patrimonio/hooks';
import { usePagos, useEgresos } from '../../finanzas/hooks';
import { useActividades } from '../../academico/hooks';
import { auditoriaApi } from '../../auditoria/api';
import { supabase } from '../../../services/supabase';
import { ExportButtons, Spinner } from '../../../components/ui';

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
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="fill-slate-700 text-[11px] font-bold">
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
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
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
const SectionHeader = ({ icon: Icon, title, color = 'blue' }) => {
  const tc = { blue: 'text-blue-600', emerald: 'text-emerald-600', purple: 'text-purple-600', amber: 'text-amber-600' }[color] || 'text-blue-600';
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`h-4 w-4 ${tc}`} />
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{title}</h2>
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

  const [quarterFilter, setQuarterFilter] = useState('ALL');
  const [blockchainOnline, setBlockchainOnline] = useState(null);
  const [auditStats, setAuditStats] = useState(null);
  const [amortPendientes, setAmortPendientes] = useState(0);

  // Blockchain + Amortization alerts
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [online, stats] = await Promise.all([
          auditoriaApi.verificarConexion(),
          auditoriaApi.obtenerEstadisticas()
        ]);
        if (!cancelled) { setBlockchainOnline(online); setAuditStats(stats); }
      } catch { if (!cancelled) setBlockchainOnline(false); }

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

  const fI = useMemo(() => filterQ(allI, quarterFilter, selectedYear), [allI, quarterFilter, selectedYear]);
  const fE = useMemo(() => filterQ(allE, quarterFilter, selectedYear), [allE, quarterFilter, selectedYear]);

  const totalI = fI.reduce((s, x) => s + Number(x.monto || 0), 0);
  const totalE = fE.reduce((s, x) => s + Number(x.monto || 0), 0);
  const saldo = totalI - totalE;
  const margenSuperavit = totalI > 0 ? ((saldo / totalI) * 100).toFixed(1) : '0.0';
  const eficienciaOp = totalI > 0 ? (100 - (totalE / totalI) * 100).toFixed(1) : '100.0';

  // Morosidad
  const ingPendientes = allI.filter(i => i.estado === 'pendiente').length;
  const ingPagados = allI.filter(i => i.estado === 'pagada').length;
  const tasaCobro = allI.length > 0 ? ((ingPagados / allI.length) * 100).toFixed(0) : '100';

  // Patrimonio
  const totalActivos = (activos || []).length;
  const valorPatrimonio = (activos || []).reduce((s, a) => s + Number(a.costo_total || 0), 0);
  const activosOperativos = (activos || []).filter(a => a.estado === 'activo').length;

  // Académico
  const totalActividades = (actividades || []).length;
  const actividadesActivas = (actividades || []).filter(a => a.estado === 'activo' || a.estado === 'programado').length;

  // Sellado blockchain
  const sellados = allI.filter(i => i.hash_actual).length + allE.filter(e => e.hash_actual).length;
  const totalTx = allI.length + allE.length;
  const pctSellado = totalTx > 0 ? Math.round((sellados / totalTx) * 100) : 100;

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
    { 'Métrica / Indicador': 'Cobertura Blockchain', 'Valor Calculado': `${pctSellado}%` },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-slate-500 font-medium animate-pulse">Cargando consola de inteligencia financiera…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Consola de Inteligencia Financiera
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ejercicio fiscal {selectedYear} · Soporte integral a la toma de decisiones
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quarter filter */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-bold">
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

      {/* ═══ SECCIÓN 1: FINANZAS ═══ */}
      <section>
        <SectionHeader icon={Landmark} title="Indicadores Financieros" color="blue" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Receipt} label="Ingresos Totales" value={fmt(totalI)} sub={`${fI.length} transacciones`} color="emerald" />
          <KpiCard icon={Banknote} label="Egresos Realizados" value={fmt(totalE)} sub={`${fE.length} operaciones`} color="rose" />
          <KpiCard icon={CircleDollarSign} label="Saldo Neto Disponible" value={fmt(saldo)} sub={saldo >= 0 ? 'Superávit' : 'Déficit'} color={saldo >= 0 ? 'blue' : 'rose'} />
          <KpiCard icon={Scale} label="Margen de Superávit" value={`${margenSuperavit}%`} sub="Ing. neto / Ing. total" color="indigo" />
        </div>

        {/* Row 2: Ratios */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <Donut value={Number(eficienciaOp)} color="#3b82f6" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eficiencia Operativa</p>
              <p className="text-lg font-extrabold text-slate-900">{eficienciaOp}%</p>
              <p className="text-xs text-slate-500">Capacidad de ahorro</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <Donut value={Number(tasaCobro)} color="#10b981" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Cobro</p>
              <p className="text-lg font-extrabold text-slate-900">{tasaCobro}%</p>
              <p className="text-xs text-slate-500">{ingPendientes} pendientes</p>
            </div>
          </div>
          <KpiCard icon={Percent} label="Liquidez Inmediata" value={totalE > 0 ? (saldo / totalE).toFixed(2) : '∞'} sub="Saldo / Egresos" color="purple" />
          <KpiCard icon={Gem} label="Índice de Cobertura" value={valorPatrimonio > 0 ? (saldo / valorPatrimonio * 100).toFixed(1) + '%' : 'N/A'} sub="Saldo / Patrimonio" color="amber" />
        </div>
      </section>

      {/* ═══ SECCIÓN 2: MIEMBROS ═══ */}
      <section>
        <SectionHeader icon={UsersRound} title="Gestión de Miembros" color="purple" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={UsersRound} label="Total Miembros" value={kpis?.totalMiembros || 0} sub="Registrados en el sistema" color="purple" />
          <KpiCard icon={UserCheck} label="Miembros Activos" value={kpis?.miembrosActivos || 0} sub="Habilitados" color="emerald" />
          <KpiCard icon={UserX} label="Miembros Inactivos" value={kpis?.miembrosInactivos || 0} sub="Dados de baja" color="rose" />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <Donut value={kpis?.tasaRetention || 0} color="#8b5cf6" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Retención</p>
              <p className="text-lg font-extrabold text-slate-900">{kpis?.tasaRetention || 0}%</p>
              <p className="text-xs text-slate-500">Activos / Total</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECCIÓN 3: PATRIMONIO ═══ */}
      <section>
        <SectionHeader icon={Warehouse} title="Control Patrimonial" color="amber" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Package} label="Activos Registrados" value={totalActivos} sub={`${activosOperativos} operativos`} color="amber" />
          <KpiCard icon={Landmark} label="Valor Patrimonial" value={fmt(valorPatrimonio)} sub="Costo total acumulado" color="blue" />
          <KpiCard icon={ClipboardList} label="Cuotas Amortización" value={amortPendientes} sub="Pendientes de pago" color={amortPendientes > 0 ? 'rose' : 'emerald'} />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <Donut value={totalActivos > 0 ? (activosOperativos / totalActivos * 100) : 100} color="#f59e0b" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activos Operativos</p>
              <p className="text-lg font-extrabold text-slate-900">
                {totalActivos > 0 ? Math.round(activosOperativos / totalActivos * 100) : 100}%
              </p>
              <p className="text-xs text-slate-500">En uso / Total</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECCIÓN 4: ACADÉMICO ═══ */}
      <section>
        <SectionHeader icon={GraduationCap} title="Gestión Académica" color="emerald" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={BookOpenCheck} label="Total Actividades" value={totalActividades} sub="Eventos y capacitaciones" color="emerald" />
          <KpiCard icon={CalendarCheck} label="Programadas / Activas" value={actividadesActivas} sub="En curso o por iniciar" color="blue" />
          <KpiCard icon={GraduationCap} label="Finalizadas" value={totalActividades - actividadesActivas} sub="Completadas con éxito" color="purple" />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <Donut value={totalActividades > 0 ? (actividadesActivas / totalActividades * 100) : 0} color="#10b981" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Ejecución</p>
              <p className="text-lg font-extrabold text-slate-900">
                {totalActividades > 0 ? Math.round((totalActividades - actividadesActivas) / totalActividades * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500">Completadas / Total</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECCIÓN 5: AUDITORÍA BLOCKCHAIN ═══ */}
      <section>
        <SectionHeader icon={Fingerprint} title="Auditoría y Blockchain" color="blue" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${blockchainOnline ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <Signal className={`h-5 w-5 ${blockchainOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado Red</p>
              <p className={`text-lg font-extrabold ${blockchainOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                {blockchainOnline === null ? '...' : blockchainOnline ? 'En Línea' : 'Offline'}
              </p>
              <p className="text-xs text-slate-500">Hyperledger Fabric</p>
            </div>
          </div>
          <KpiCard icon={ShieldCheck} label="Registros Sellados" value={sellados} sub={`de ${totalTx} transacciones`} color="blue" />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <Donut value={pctSellado} color="#3b82f6" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cobertura Cripto</p>
              <p className="text-lg font-extrabold text-slate-900">{pctSellado}%</p>
              <p className="text-xs text-slate-500">Inmutabilidad</p>
            </div>
          </div>
          <KpiCard icon={FileSpreadsheet} label="Bloques Fabricados" value={auditStats?.totalRegistros ?? '—'} sub="Cadena de auditoría" color="indigo" />
        </div>
      </section>
    </div>
  );
};
