import { useState } from 'react';
import { Filter, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePagos } from '../hooks';
import { Spinner, Button } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const HistorialCuotasPage = () => {
  const { cuotas, loading, error } = usePagos();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const columns = [
    { key: 'miembroId', label: 'Miembro' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'monto', label: 'Monto' },
    { key: 'estado', label: 'Estado' },
  ];
  const totalPages = Math.ceil(cuotas.length / ITEMS_PER_PAGE);
  const paginatedCuotas = cuotas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const rows = paginatedCuotas.map((cuota) => ({
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
            <>
              <Table columns={columns} rows={rows} emptyMessage="No hay cuotas registradas." />
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                  <p className="text-xs text-slate-500">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, cuotas.length)} de {cuotas.length} registros
                  </p>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      className="h-8 px-2 text-xs" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "outline"}
                        className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button 
                      variant="outline" 
                      className="h-8 px-2 text-xs" 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};
