import { useEffect, useState } from 'react';
import { CalendarDays, ArrowLeft, Users, Clock, ArrowRight, CheckCircle2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { academicoApi } from '../api';
import { useAuthStore } from '../../../store/authStore';

export const PublicCursosPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9; // 3 columns * 3 rows

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [acts, insc] = await Promise.all([
          academicoApi.obtenerActividades(),
          isAuthenticated && user?.id ? academicoApi.obtenerInscripcionesUsuario(user.id) : Promise.resolve([])
        ]);

        const enrolledIds = new Set(insc.map(i => i.actividad_id));

        const processed = acts
          .filter(a => {
            // Hide activities explicitly unpublished by admin
            if (a.publicado === false) return false;
            // Hide activities whose date passed more than 7 days ago
            if (a.fecha) {
              const actDate = new Date(a.fecha);
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              if (actDate < sevenDaysAgo) return false;
            }
            return true;
          })
          .map(a => ({
            ...a,
            isEnrolled: enrolledIds.has(a.id)
          }));

        processed.sort((a, b) => {
          // 1. Inscritos primero
          if (a.isEnrolled && !b.isEnrolled) return -1;
          if (!a.isEnrolled && b.isEnrolled) return 1;
          
          // 2. Finalizados al último
          if (a.estado === 'finalizado' && b.estado !== 'finalizado') return 1;
          if (a.estado !== 'finalizado' && b.estado === 'finalizado') return -1;

          // 3. Orden por fecha
          return new Date(a.fecha) - new Date(b.fecha);
        });

        setActividades(processed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, user?.id]);

  const filteredActividades = actividades.filter(act => {
    const query = searchQuery.toLowerCase();
    return (
      act.nombre?.toLowerCase().includes(query) ||
      act.descripcion?.toLowerCase().includes(query) ||
      (act.estado && act.estado.toLowerCase().includes(query)) ||
      (act.fecha && new Date(act.fecha).toLocaleDateString('es-ES').includes(query))
    );
  });

  const totalPages = Math.ceil(filteredActividades.length / ITEMS_PER_PAGE);
  const paginatedActividades = filteredActividades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/inicio" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Agenda de Actividades</h1>
          <p className="text-slate-500 mt-2 text-base sm:text-lg">Explora y participa en nuestros cursos, talleres y eventos institucionales.</p>
        </div>
      </header>

      {/* buscador premium */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Buscar actividad por nombre, descripción..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Mostrando <span className="text-slate-950 font-bold">{filteredActividades.length}</span> {filteredActividades.length === 1 ? 'actividad' : 'actividades'}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-[350px] sm:h-[400px] animate-pulse rounded-2xl sm:rounded-3xl bg-slate-100 shadow-inner" />)
        ) : paginatedActividades.length > 0 ? (
          paginatedActividades.map((act) => (
            <Link key={act.id} to={`/cursos/${act.id}`} className="group relative flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden hover:-translate-y-2">
              {/* Imagen de Cabecera */}
              <div className="relative h-44 sm:h-56 w-full overflow-hidden">
                {act.imagen ? (
                  <img src={act.imagen} alt={act.nombre} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                    <span className="text-white/20 font-black text-6xl italic">CURSO</span>
                  </div>
                )}
                {/* Badge de Estado */}
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md border border-white/20 text-white ${
                    act.estado === 'finalizada' ? 'bg-slate-900/60' : 'bg-emerald-500/80'
                  }`}>
                    {act.estado || 'Programada'}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4 sm:p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {act.nombre}
                  </h3>
                  {act.isEnrolled && (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md uppercase tracking-widest">
                      <CheckCircle2 className="h-3 w-3" /> Inscrito
                    </span>
                  )}
                </div>
                
                <p className="mt-3 text-sm text-slate-500 line-clamp-3 leading-relaxed">
                  {act.descripcion || 'Sin descripción detallada disponible en este momento. Únete para potenciar tus conocimientos.'}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CalendarDays className="h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">FECHA</span>
                      <span className="text-xs font-bold">{new Date(act.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">CUPOS</span>
                      <span className="text-xs font-bold">{act.cupos || 0} plazas</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-black text-emerald-600 group-hover:gap-3 transition-all">
                    MÁS DETALLES <ArrowRight className="h-4 w-4" />
                  </span>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-16 sm:py-32 flex flex-col items-center justify-center bg-white rounded-2xl sm:rounded-[40px] border border-dashed border-slate-200">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <Users className="h-12 w-12 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-medium italic">No se encontraron actividades.</p>
          </div>
        )}
      </div>

      {/* paginacion responsive */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500">
            Mostrando <span className="font-semibold text-slate-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a <span className="font-semibold text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredActividades.length)}</span> de <span className="font-semibold text-slate-900">{filteredActividades.length}</span> actividades
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
