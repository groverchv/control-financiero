import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Search, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Clock, 
  Calendar, AlertTriangle,
  RefreshCw, ArrowRight
} from 'lucide-react';
import { finanzasApi } from '../api';
import { Button, Spinner, ExportButtons } from '../../../components/ui';
import { Toast } from '../../../components/feedback';

export const HistorialActividadesPage = () => {
  const navigate = useNavigate();
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'pagados' | 'pendientes'
  const [filtroActividad, setFiltroActividad] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const historialData = await finanzasApi.obtenerHistorialActividades();
      setInscripciones(historialData);
    } catch (err) {
      setError(err.message || 'Error al cargar el historial de actividades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await cargarDatos();
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [cargarDatos]);

  // Obtener lista de actividades únicas para el filtro
  const actividadesUnicas = Array.from(
    new Set(inscripciones.map(i => i.actividad_titulo))
  ).sort();

  // Filtrado de la lista
  const filtrado = inscripciones.filter(i => {
    const nombreCompleto = (i.socio_nombre || '').toLowerCase();
    const email = (i.socio_email || '').toLowerCase();
    const matchSearch = nombreCompleto.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    
    const matchEstado = filtroEstado === 'todos' 
      ? true 
      : filtroEstado === 'pagados' 
        ? i.estado === 'pagado' 
        : i.estado !== 'pagado';

    const matchActividad = filtroActividad === 'todos'
      ? true
      : i.actividad_titulo === filtroActividad;

    return matchSearch && matchEstado && matchActividad;
  });

  const totalPages = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = filtrado.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Estadísticas globales
  const totalInscripciones = inscripciones.length;
  
  const inscripcionesPagadas = inscripciones.filter(i => i.estado === 'pagado');
  const totalRecaudado = inscripcionesPagadas.reduce((acc, curr) => acc + curr.actividad_costo, 0);
  const cantPagadas = inscripcionesPagadas.length;

  const inscripcionesPendientes = inscripciones.filter(i => i.estado !== 'pagado');
  const totalDeuda = inscripcionesPendientes.reduce((acc, curr) => acc + curr.actividad_costo, 0);
  const cantPendientes = inscripcionesPendientes.length;

  const handlePagarAhora = (insc) => {
    navigate('/admin/ingresos', {
      state: {
        autoOpenCreate: true,
        socioId: insc.miembro_id,
        socioNombre: insc.socio_nombre,
        socioCorreo: insc.socio_email,
        inscripcionId: insc.id,
        monto: insc.actividad_costo,
        actividadTitulo: insc.actividad_titulo,
        actividadId: insc.actividad_id
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Historial de Actividades
          </h1>
          <p className="text-sm text-slate-500">
            Seguimiento de inscripciones a cursos, talleres y actividades de pago. Control de deudas y facturación.
          </p>
        </div>
      </header>

      {/* Tarjetas de Estadísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-slate-900 truncate">{totalInscripciones}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Total Inscripciones</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-emerald-600 truncate">Bs. {totalRecaudado.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Recaudado ({cantPagadas} Cursos)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-red-600 truncate">Bs. {totalDeuda.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Pendiente ({cantPendientes} Deudas)</p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Listado de inscripciones a actividades
            </h2>
          </div>
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 w-full max-w-3xl">
              <ExportButtons 
                data={filtrado.map(i => ({
                  Estudiante: i.socio_nombre,
                  Correo: i.socio_email,
                  Actividad: i.actividad_titulo,
                  'Tipo Actividad': i.actividad_tipo,
                  Costo: i.actividad_costo,
                  Fecha: i.actividad_fecha ? new Date(i.actividad_fecha + 'T00:00:00').toLocaleDateString('es-ES') : '—',
                  Hora: i.actividad_hora ? i.actividad_hora.substring(0, 5) : '—',
                  Estado: i.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE DE PAGO'
                }))}
                filename="historial_inscripciones_actividades"
                title="Historial Financiero de Actividades"
              />
              {/* Buscador */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por estudiante o correo..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors bg-white"
                />
              </div>

              {/* Selector de Actividad */}
              <div className="relative min-w-[200px]">
                <select
                  value={filtroActividad}
                  onChange={e => { setFiltroActividad(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors bg-white"
                >
                  <option value="todos">Todas las actividades</option>
                  {actividadesUnicas.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>
            </div>
            <span className="text-sm text-slate-500 whitespace-nowrap">{filtrado.length} registros</span>
          </div>

          {/* Filtros de estado rápido */}
          <div className="flex border-b border-slate-100 pb-1 gap-2">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pagados', label: 'Pagados' },
              { id: 'pendientes', label: 'Pendientes de Pago' },
            ].map(btn => (
              <button
                key={btn.id}
                type="button"
                onClick={() => { setFiltroEstado(btn.id); setCurrentPage(1); }}
                className={`pb-2.5 px-3 font-semibold text-sm transition-all border-b-2 relative -mb-[1px] ${
                  filtroEstado === btn.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
                <Spinner size="md" />
                <span className="text-sm font-medium">Cargando historial financiero...</span>
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : paginado.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No se encontraron inscripciones con los filtros seleccionados.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 font-medium mb-3">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtrado.length)} de {filtrado.length} registros
                </p>
                <div className="grid gap-4">
                  {paginado.map(insc => {
                    const init1 = insc.socio_nombre?.charAt(0) || 'E';
                    const init2 = insc.socio_nombre?.split(' ')?.[1]?.charAt(0) || '';
                    
                    return (
                      <div key={insc.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-slate-300 hover:shadow-sm">
                        {/* Sección Estudiante + Curso */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                            {init1}{init2}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900 truncate max-w-[200px]">{insc.socio_nombre}</h3>
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                {insc.actividad_tipo}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{insc.socio_email}</p>
                            
                            <div className="mt-2 text-slate-700 font-semibold text-sm flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>{insc.actividad_titulo}</span>
                            </div>
                          </div>
                        </div>

                        {/* Metadatos Horario */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 shrink-0 sm:px-6">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>
                              {insc.actividad_fecha 
                                ? new Date(insc.actividad_fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'Sin fecha'
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span>
                              {insc.actividad_hora 
                                ? insc.actividad_hora.substring(0, 5) 
                                : 'Sin hora'
                              }
                            </span>
                          </div>
                        </div>

                        {/* Costo, Estado e Botones de Acción */}
                        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                          <div>
                            <p className="text-right text-lg font-black text-slate-900">
                              {insc.total_pagado > insc.actividad_costo ? (
                                <span className="text-xs font-normal text-slate-500 block">
                                  Costo: Bs. {insc.actividad_costo.toFixed(2)} | Pagado: Bs. {insc.total_pagado.toFixed(2)}
                                </span>
                              ) : null}
                              Bs. {insc.actividad_costo.toFixed(2)}
                            </p>
                            <div className="mt-1 flex justify-end">
                              {insc.total_pagado > insc.actividad_costo ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  <AlertCircle className="h-3 w-3" />
                                  Devolución (Bs. {(insc.total_pagado - insc.actividad_costo).toFixed(2)} a favor)
                                </span>
                              ) : insc.estado === 'pagado' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Pagado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  <AlertCircle className="h-3 w-3" />
                                  Deudor
                                </span>
                              )}
                            </div>
                          </div>

                          {insc.estado !== 'pagado' && (
                            <button
                              type="button"
                              onClick={() => handlePagarAhora(insc)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm shadow-blue-100 hover:shadow transition-all shrink-0 hover:translate-x-0.5"
                            >
                              Pagar ahora
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Página {currentPage} de {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" className="h-8 px-2 text-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'primary' : 'outline'}
                className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button variant="outline" className="h-8 px-2 text-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
