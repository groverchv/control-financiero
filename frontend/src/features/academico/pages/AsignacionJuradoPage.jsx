import { Gavel, UserPlus } from 'lucide-react';
import { useAsignacionesJurado } from '../hooks';
import { Button, Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const AsignacionJuradoPage = () => {
  const { asignaciones, loading, error } = useAsignacionesJurado();
  const columns = [
    { key: 'eventoId', label: 'Evento' },
    { key: 'juradoId', label: 'Jurado' },
    { key: 'rol', label: 'Rol' },
    { key: 'estado', label: 'Estado' },
  ];
  const rows = asignaciones.map((asignacion) => ({
    ...asignacion,
    estado: (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
        {asignacion.estado}
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Asignacion de jurados</h1>
          <p className="text-sm text-slate-500">Gestiona roles y evaluadores para eventos academicos.</p>
        </div>
        <Button type="button">
          <UserPlus className="h-4 w-4" />
          Asignar jurado
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Asignaciones recientes</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando asignaciones...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={rows} emptyMessage="No hay asignaciones registradas." />
          )}
        </div>
      </section>
    </div>
  );
};
