import { Archive, Filter } from 'lucide-react';
import { useActivos } from '../hooks';
import { Spinner } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const CatalogoActivosPage = () => {
  const { activos, loading, error } = useActivos();
  const columns = [
    { key: 'nombre', label: 'Activo' },
    { 
      key: 'tipo_activo', 
      label: 'Tipo',
      render: (val) => val?.nombre || 'Sin tipo'
    },
    { 
      key: 'costo_total', 
      label: 'Costo Total',
      render: (val) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val || 0)
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Catalogo de activos</h1>
          <p className="text-sm text-slate-500">Inventario actualizado y segmentado por categoria.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Listado general</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando catalogo...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={activos} emptyMessage="No hay activos disponibles." />
          )}
        </div>
      </section>
    </div>
  );
};
