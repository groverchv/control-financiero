import { Activity, TrendingUp, Wallet } from 'lucide-react';
import { useFlujoCaja } from '../hooks';

export const FlujoCajaPage = () => {
  const { flujo, loading } = useFlujoCaja();
  const ingresos = flujo?.ingresosTotales || 0;
  const egresos = flujo?.egresosTotales || 0;
  const saldo = flujo?.saldoNeto || 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Flujo de caja</h1>
        <p className="text-sm text-slate-500">Seguimiento de ingresos y egresos acumulados.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Ingresos</p>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">
            {loading ? '0' : ingresos}
          </p>
        </div>
        <div className="rounded-md bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Egresos</p>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">
            {loading ? '0' : egresos}
          </p>
        </div>
        <div className="rounded-md bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Saldo neto</p>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">
            {loading ? '0' : saldo}
          </p>
        </div>
      </section>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Notas operativas</h2>
        <p className="mt-2 text-sm text-slate-500">
          Integra aqui los analisis financieros y proyecciones mensuales.
        </p>
      </section>
    </div>
  );
};
