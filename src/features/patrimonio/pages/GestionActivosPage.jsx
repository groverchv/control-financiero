import { PackagePlus, Search } from 'lucide-react';
import { useActivos } from '../hooks';
import { Button, Input, Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const GestionActivosPage = () => {
  const { activos, loading, error } = useActivos();
  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'valorActual', label: 'Valor actual' },
    { key: 'fechaAdquisicion', label: 'Fecha' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de activos</h1>
          <p className="text-sm text-slate-500">Control del inventario institucional.</p>
        </div>
        <Button type="button">
          <PackagePlus className="h-4 w-4" />
          Registrar activo
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input className="flex-1" placeholder="Buscar activo" />
          </div>
          <span className="text-sm text-slate-500">{activos.length} activos</span>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando activos...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={activos} emptyMessage="No hay activos registrados." />
          )}
        </div>
      </section>
    </div>
  );
};
