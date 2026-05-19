import { useEffect, useState } from 'react';
import { CreditCard, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { finanzasApi } from '../../finanzas/api';
import { useAuthStore } from '../../../store/authStore';
import { Table } from '../../../components/data-display';
import { Spinner, ExportButtons } from '../../../components/ui';

export const EstadoCuentaSocioPage = () => {
  const { user } = useAuthStore();
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchIngresos = async () => {
      if (user?.id) {
        try {
          const data = await finanzasApi.obtenerCuotas(user.id);
          setIngresos(data || []);
        } catch (error) {
          console.error("Error al cargar estado de cuenta:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchIngresos();
  }, [user]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredIngresos = ingresos.filter(ingreso => {
    const query = searchQuery.toLowerCase();
    const concepto = ingreso.tipo_ingreso_nombre !== 'Ingreso' ? ingreso.tipo_ingreso_nombre : (ingreso.descripcion || 'Cuota/Ingreso');
    const registrador = ingreso.registrado_por_nombre || '';
    const estado = ingreso.estado || 'pagada';
    
    return (
      concepto.toLowerCase().includes(query) ||
      registrador.toLowerCase().includes(query) ||
      estado.toLowerCase().includes(query) ||
      new Date(ingreso.creacion).toLocaleDateString('es-ES').includes(query)
    );
  });

  const totalPages = Math.ceil(filteredIngresos.length / ITEMS_PER_PAGE);
  const paginatedIngresos = filteredIngresos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const columns = [
    { key: 'fecha', label: 'Fecha de Registro' },
    { key: 'concepto', label: 'Concepto' },
    { key: 'monto_display', label: 'Monto' },
    { key: 'registrador', label: 'Registrado Por' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const rows = paginatedIngresos.map(ingreso => ({
    id: ingreso.id,
    fecha: formatDate(ingreso.creacion),
    concepto: ingreso.tipo_ingreso_nombre !== 'Ingreso' ? ingreso.tipo_ingreso_nombre : (ingreso.descripcion || 'Cuota/Ingreso'),
    monto_display: <span className="font-semibold text-emerald-600">{formatCurrency(ingreso.monto)}</span>,
    registrador: (
      <div className="flex flex-col">
        <span className="font-medium text-slate-800">{ingreso.registrado_por_nombre}</span>
      </div>
    ),
    estado_display: (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
        ingreso.estado === 'pagada' ? 'bg-emerald-100 text-emerald-700' :
        ingreso.estado === 'vencida' ? 'bg-red-100 text-red-700' :
        'bg-orange-100 text-orange-700'
      }`}>
        {ingreso.estado || 'pagada'}
      </span>
    ),
  }));

  const exportData = filteredIngresos.map(i => ({
    Fecha: formatDate(i.creacion),
    Concepto: i.tipo_ingreso_nombre !== 'Ingreso' ? i.tipo_ingreso_nombre : (i.descripcion || 'Cuota/Ingreso'),
    Monto: i.monto,
    'Registrado Por': i.registrado_por_nombre,
    Estado: i.estado || 'pagada'
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Estado de Cuenta</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Historial completo de tus pagos y aportes registrados.</p>
        </div>
        <ExportButtons 
          data={exportData} 
          filename="estado_de_cuenta" 
          title={`Estado de Cuenta - ${user?.nombre || 'Socio'}`} 
        />
      </header>

      <section className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Historial de Ingresos</h2>
          </div>

          {/* buscador premium */}
          {!loading && ingresos.length > 0 && (
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Buscar por concepto, estado..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Spinner />
            <span className="ml-2 text-sm">Cargando registros...</span>
          </div>
        ) : (
          <>
            <Table columns={columns} rows={rows} emptyMessage={searchQuery ? "No se encontraron ingresos para tu búsqueda." : "No tienes ingresos registrados."} />

            {/* paginacion responsive */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-4">
                <p className="text-xs text-slate-500">
                  Mostrando <span className="font-semibold text-slate-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a <span className="font-semibold text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredIngresos.length)}</span> de <span className="font-semibold text-slate-900">{filteredIngresos.length}</span> registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Anterior
                  </button>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                  >
                    Siguiente
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
