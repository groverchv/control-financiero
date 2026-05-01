import { FileBarChart2 } from 'lucide-react';
import { useReportesFinancieros } from '../hooks';
import { Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const ReportesFinancierosPage = () => {
  const { reportes, loading, error } = useReportesFinancieros();
  const columns = [
    { key: 'periodo', label: 'Periodo' },
    { key: 'totalIngresos', label: 'Ingresos' },
    { key: 'totalEgresos', label: 'Egresos' },
    { key: 'saldo', label: 'Saldo' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Reportes financieros</h1>
        <p className="text-sm text-slate-500">Consolida resultados mensuales y anuales.</p>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Reportes generados</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando reportes...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={reportes} emptyMessage="No hay reportes disponibles." />
          )}
        </div>
      </section>
    </div>
  );
};
