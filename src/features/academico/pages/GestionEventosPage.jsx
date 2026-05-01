import { CalendarCheck, CalendarPlus } from 'lucide-react';
import { useEventos } from '../hooks';
import { Button, Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const GestionEventosPage = () => {
  const { eventos, loading, error } = useEventos();
  const columns = [
    { key: 'nombre', label: 'Evento' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'asistentes', label: 'Asistentes' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de eventos</h1>
          <p className="text-sm text-slate-500">Coordina la agenda academica institucional.</p>
        </div>
        <Button type="button">
          <CalendarPlus className="h-4 w-4" />
          Nuevo evento
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Eventos programados</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando eventos...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={eventos} emptyMessage="No hay eventos registrados." />
          )}
        </div>
      </section>
    </div>
  );
};
