import { Activity, BadgeCheck, Users, UsersRound } from 'lucide-react';
import { useKpiData } from '../hooks';

const kpiCards = [
  { key: 'totalMiembros', label: 'Total de miembros', icon: Users },
  { key: 'miembrosActivos', label: 'Miembros activos', icon: UsersRound },
  { key: 'miembrosInactivos', label: 'Miembros inactivos', icon: Activity },
  { key: 'tasaRetention', label: 'Tasa de retencion', icon: BadgeCheck, suffix: '%' },
];

export const DashboardKpisPage = () => {
  const { kpis, loading } = useKpiData();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard de KPIs</h1>
        <p className="text-sm text-slate-500">Indicadores clave para seguimiento institucional.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const value = kpis ? kpis[card.key] : 0;
          return (
            <div key={card.key} className="rounded-md bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.label}</p>
                <Icon className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {loading ? '0' : value}{card.suffix || ''}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Resumen operativo</h2>
        <p className="mt-2 text-sm text-slate-500">
          Consolida tendencias de membresia, alertas y rendimiento general.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Retencion mensual</p>
            <p className="mt-2 text-sm text-slate-500">Proxima integracion de grafico.</p>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Alertas activas</p>
            <p className="mt-2 text-sm text-slate-500">Sin alertas criticas.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
