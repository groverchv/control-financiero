import { useEffect, useState } from 'react';
import { CalendarDays, ArrowLeft, Users, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { academicoApi } from '../api';
import { useAuthStore } from '../../../store/authStore';

export const PublicCursosPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [acts, insc] = await Promise.all([
          academicoApi.obtenerActividades(),
          isAuthenticated && user?.id ? academicoApi.obtenerInscripcionesUsuario(user.id) : Promise.resolve([])
        ]);

        const enrolledIds = new Set(insc.filter(i => i.actividad_academica_id).map(i => i.actividad_academica_id));

        const processed = acts.map(a => ({
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

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/inicio" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Oferta Académica</h1>
          <p className="text-slate-500 mt-2 text-base sm:text-lg">Cursos, talleres y capacitaciones disponibles para nuestros miembros.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-[350px] sm:h-[400px] animate-pulse rounded-2xl sm:rounded-3xl bg-slate-100 shadow-inner" />)
        ) : actividades.length > 0 ? (
          actividades.map((act) => (
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
            <p className="text-slate-500 text-lg font-medium italic">No hay actividades académicas registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
};
