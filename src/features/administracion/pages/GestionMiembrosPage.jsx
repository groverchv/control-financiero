import { Plus, Search } from 'lucide-react';
import { useMiembros } from '../hooks';
import { Button, Input, Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const GestionMiembrosPage = () => {
  const { miembros, loading, error } = useMiembros();
  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'telefono', label: 'Telefono' },
    { key: 'estado', label: 'Estado' },
  ];
  const rows = miembros.map((miembro) => ({
    ...miembro,
    estado: (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
        {miembro.estado}
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de miembros</h1>
          <p className="text-sm text-slate-500">Administra el registro institucional de socios.</p>
        </div>
        <Button type="button">
          <Plus className="h-4 w-4" />
          Nuevo miembro
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o correo"
              className="flex-1"
            />
          </div>
          <span className="text-sm text-slate-500">{miembros.length} registros</span>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando miembros...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={rows} emptyMessage="No hay miembros registrados." />
          )}
        </div>
      </section>
    </div>
  );
};
