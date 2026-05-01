import { Filter, History } from 'lucide-react';
import { usePagos } from '../hooks';
import { Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const HistorialCuotasPage = () => {
  const { cuotas, loading, error } = usePagos();
  const columns = [
    { key: 'miembroId', label: 'Miembro' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'monto', label: 'Monto' },
    { key: 'estado', label: 'Estado' },
  ];
  const rows = cuotas.map((cuota) => ({
    ...cuota,
    monto: `${cuota.moneda} ${cuota.monto}`,
    estado: (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
        {cuota.estado}
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Historial de cuotas</h1>
          <p className="text-sm text-slate-500">Consulta pagos y donaciones registrados.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Registro completo</h2>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando historial...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={rows} emptyMessage="No hay cuotas registradas." />
          )}
        </div>
      </section>
    </div>
  );
};
