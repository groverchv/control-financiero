import { CalendarPlus, ClipboardList } from 'lucide-react';
import { useActividades } from '../hooks';
import { Button, Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const GestionActividadesPage = () => {
  const { actividades, loading, error } = useActividades();
  const columns = [
    { key: 'nombre', label: 'Actividad' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'responsable', label: 'Responsable' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de actividades</h1>
          <p className="text-sm text-slate-500">Planifica y registra actividades academicas.</p>
        </div>
        <Button type="button">
          <CalendarPlus className="h-4 w-4" />
          Nueva actividad
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Listado de actividades</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando actividades...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={actividades} emptyMessage="No hay actividades registradas." />
          )}
        </div>
      </section>
    </div>
  );
};
