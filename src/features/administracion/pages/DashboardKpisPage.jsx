import { Activity, BadgeCheck, Users, UsersRound, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, FileDown } from 'lucide-react';
import { useKpiData } from '../hooks';
import { useFlujoCaja } from '../../finanzas/hooks';
import { ExportButtons } from '../../../components/ui';

const kpiCards = [
  { key: 'totalMiembros', label: 'Total de miembros', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'miembrosActivos', label: 'Miembros activos', icon: UsersRound, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'miembrosInactivos', label: 'Miembros inactivos', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'tasaRetention', label: 'Tasa de retención', icon: BadgeCheck, suffix: '%', color: 'text-purple-600', bg: 'bg-purple-50' },
];

export const DashboardKpisPage = () => {
  const { kpis, loading: loadingKpis } = useKpiData();
  const { flujo, loading: loadingFlujo } = useFlujoCaja();

  const ingresos = flujo?.ingresosTotales || 0;
  const egresos = flujo?.egresosTotales || 0;
  const saldo = flujo?.saldoNeto || 0;

  const formatCurrency = (val) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val);

  // Preparar datos para exportar
  const exportData = [
    { Indicador: 'Ingresos Totales', Valor: ingresos },
    { Indicador: 'Egresos Totales', Valor: egresos },
    { Indicador: 'Saldo Neto', Valor: saldo },
    { Indicador: 'Total Miembros', Valor: kpis?.totalMiembros || 0 },
    { Indicador: 'Miembros Activos', Valor: kpis?.miembrosActivos || 0 },
    { Indicador: 'Tasa de Retención', Valor: `${kpis?.tasaRetention || 0}%` },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Institucional</h1>
          <p className="text-sm text-slate-500">Vista general de la salud financiera y membresía.</p>
        </div>
        <ExportButtons 
          data={exportData} 
          filename="dashboard_general" 
          title="Reporte de Dashboard Institucional" 
        />
      </header>

      {/* SECCIÓN FINANCIERA (FLUJO DE CAJA) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-800">Resumen Financiero (Flujo de Caja)</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Ingresos</p>
              <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {loadingFlujo ? '...' : formatCurrency(ingresos)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Egresos</p>
              <div className="rounded-full bg-red-50 p-2 text-red-600">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {loadingFlujo ? '...' : formatCurrency(egresos)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Saldo Neto Disponible</p>
              <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-4 text-3xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {loadingFlujo ? '...' : formatCurrency(saldo)}
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN MEMBRESÍA */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-800">Indicadores de Membresía</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const value = kpis ? kpis[card.key] : 0;
            return (
              <div key={card.key} className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <div className={`rounded-full ${card.bg} p-2 ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900">
                  {loadingKpis ? '0' : value}{card.suffix || ''}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* RESUMEN OPERATIVO ADICIONAL */}
      <section className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Análisis Operativo</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Estado de Retención</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-bold text-slate-900">{kpis?.tasaRetention || 0}%</span>
              <span className="mb-1 text-sm text-emerald-600 font-medium">Estable</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Basado en el pago de cuotas del último trimestre.</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Balance Financiero</p>
            <div className="mt-4 flex items-end gap-2">
              <span className={`text-4xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {saldo >= 0 ? 'Saludable' : 'Déficit'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Relación porcentual entre ingresos y egresos registrados.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
