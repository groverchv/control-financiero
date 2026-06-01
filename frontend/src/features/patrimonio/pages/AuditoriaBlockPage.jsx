import { ShieldCheck } from 'lucide-react';
import { useAuditorias } from '../hooks';
import { Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const AuditoriaBlockPage = () => {
  const { auditorias, loading, error } = useAuditorias();
  const columns = [
    { key: 'activoId', label: 'Activo' },
    { key: 'hash', label: 'Hash' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'estado', label: 'Estado' },
  ];
  const rows = auditorias.map((auditoria) => ({
    ...auditoria,
    estado: (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
        {auditoria.estado}
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Auditoria blockchain</h1>
        <p className="text-sm text-slate-500">Sellado y trazabilidad de activos institucionales.</p>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Registros de auditoria</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando auditorias...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={rows} emptyMessage="No hay auditorias registradas." />
          )}
        </div>
      </section>
    </div>
  );
};
