import { useEffect, useState } from 'react';
import { Calendar, Users, ArrowLeft, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { academicoApi } from '../api';
import { useAuthStore } from '../../../store/authStore';

export const PublicEventosPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evs, insc] = await Promise.all([
          academicoApi.obtenerEventos(),
          isAuthenticated && user?.id ? academicoApi.obtenerInscripcionesUsuario(user.id) : Promise.resolve([])
        ]);

        const enrolledIds = new Set(insc.filter(i => i.evento_id).map(i => i.evento_id));

        const processed = evs.map(e => ({
          ...e,
          isEnrolled: enrolledIds.has(e.id)
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

        setEventos(processed);
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
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">Calendario de Eventos</h1>
          <p className="text-slate-500 mt-2 text-base sm:text-lg">Explora todos los eventos institucionales programados.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-[350px] sm:h-[450px] animate-pulse rounded-2xl sm:rounded-[2.5rem] bg-slate-100 shadow-inner" />)
        ) : eventos.length > 0 ? (
          eventos.map((evento) => (
            <Link key={evento.id} to={`/eventos/${evento.id}`} className="group flex flex-col rounded-2xl sm:rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden hover:-translate-y-2">
              {/* Imagen con Overlay */}
              <div className="relative h-48 sm:h-64 w-full overflow-hidden">
                {evento.imagen ? (
                  <img src={evento.imagen} alt={evento.nombre} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-125" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
                    <Calendar className="h-16 w-16 text-white/20" />
                  </div>
                )}
                
                {/* Fecha Flotante Estilo Glass */}
                <div className="absolute top-6 left-6 flex flex-col items-center justify-center h-16 w-16 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/50 text-blue-600">
                  <span className="text-xs font-black uppercase leading-none mb-1">
                    {new Date(evento.fecha).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                  </span>
                  <span className="text-2xl font-black leading-none">
                    {new Date(evento.fecha).getDate()}
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Contenido */}
              <div className="p-5 sm:p-8 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Evento Institucional</span>
                  </div>
                  {evento.isEnrolled && (
                    <span className="flex items-center gap-1 text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-widest">
                      <CheckCircle2 className="h-3 w-3" /> Inscrito
                    </span>
                  )}
                  {evento.estado === 'finalizado' && !evento.isEnrolled && (
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-widest">Finalizado</span>
                  )}
                </div>

                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {evento.nombre}
                </h3>
                
                <p className="mt-4 text-sm text-slate-500 line-clamp-3 leading-relaxed">
                  {evento.descripcion || 'Únete a nuestra comunidad en este evento diseñado para el crecimiento profesional y networking.'}
                </p>

                <div className="mt-auto pt-5 sm:pt-8">
                  <div className="flex items-center justify-between py-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{evento.cupos || 0} Invitados</span>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:bg-blue-600 transition-all group-hover:scale-110 shadow-lg">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-16 sm:py-32 flex flex-col items-center justify-center bg-white rounded-2xl sm:rounded-[3rem] border border-dashed border-slate-200">
            <Calendar className="h-16 w-16 text-slate-200 mb-4" />
            <p className="text-slate-500 text-xl font-medium italic text-center">
              No hay eventos programados.<br/>Vuelve pronto para más novedades.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
