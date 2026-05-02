import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, BadgeCheck, Calendar, CalendarDays, ChevronRight, GraduationCap, Layers, ShieldCheck, Users, Wallet, Clock, MapPin } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { academicoApi } from '../../academico/api';

const features = [
  {
    title: 'Módulo Administrativo',
    description: 'Gestión integral de miembros, perfiles profesionales y sistema de alertas automáticas.',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  {
    title: 'Módulo Financiero',
    description: 'Control preciso de cuotas, egresos operativos, flujo de caja y reportes en tiempo real.',
    icon: Wallet,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  {
    title: 'Módulo de Patrimonio',
    description: 'Administración de activos fijos, planes de amortización y auditoría con sello Blockchain.',
    icon: Layers,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  {
    title: 'Módulo Académico',
    description: 'Organización de eventos, asignación de jurados y búsqueda de talento especializado.',
    icon: CalendarDays,
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [eventos, setEventos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evs, acts] = await Promise.all([
          academicoApi.obtenerEventos(),
          academicoApi.obtenerActividades()
        ]);
        setEventos(evs.slice(0, 3)); // Mostrar los 3 más recientes
        setActividades(acts.slice(0, 3));
      } catch (error) {
        console.error('Error fetching landing data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-12 sm:gap-16 md:gap-24 pb-10 sm:pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 px-5 sm:px-8 py-12 sm:py-20 text-white lg:px-16">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-400 border border-blue-500/20">
            <BadgeCheck className="h-4 w-4" />
            PLATAFORMA INSTITUCIONAL v2.0
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight lg:text-6xl">
            La nueva era de la <span className="text-blue-400">Gestión Institucional</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed">
            Una solución integral diseñada para potenciar la transparencia, eficiencia y trazabilidad en cada área de su organización.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/login"
              className="group flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25"
            >
              Acceso Institucional
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
        
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 sm:opacity-20 lg:opacity-100">
           <img 
            src="/hero_dashboard.png" 
            alt="Dashboard Preview" 
            className="h-full w-full object-cover object-left mask-fade-left"
          />
        </div>
      </section>

      {/* EVENTOS SECCION */}
      <section id="eventos" className="space-y-6 sm:space-y-12 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Próximos Eventos</h2>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500">Participe en nuestras actividades institucionales programadas.</p>
          </div>
          <Link to="/login" className="text-sm font-semibold text-blue-600 hover:underline shrink-0">Ver todos los eventos</Link>
        </div>

        <div className="grid gap-4 sm:gap-8 sm:grid-cols-2 md:grid-cols-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />)
          ) : eventos.length > 0 ? (
            eventos.map((evento) => (
              <div key={evento.id} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="bg-blue-600 p-4 text-white">
                  <Calendar className="h-6 w-6 opacity-75" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">{evento.nombre}</h3>
                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(evento.fecha).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {evento.asistentes} inscritos
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-slate-500 py-10 italic">No hay eventos programados en este momento.</p>
          )}
        </div>
      </section>

      {/* CURSOS SECCION */}
      <section id="cursos" className="space-y-6 sm:space-y-12 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Cursos y Capacitaciones</h2>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500">Mejore sus habilidades con nuestra oferta académica especializada.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-8 sm:grid-cols-2 md:grid-cols-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)
          ) : actividades.length > 0 ? (
            actividades.map((act) => (
              <div key={act.id} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-emerald-200">
                <div className="mb-4 inline-flex w-fit rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{act.nombre}</h3>
                <p className="mt-1 text-sm text-slate-500 capitalize">Tipo: {act.tipo}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CalendarDays className="h-4 w-4" />
                  Inicia: {new Date(act.fecha).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-slate-500 py-10 italic">Próximamente nuevas capacitaciones.</p>
          )}
        </div>
      </section>

      {/* MODULES GRID */}
      <section className="space-y-6 sm:space-y-12">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Nuestras Soluciones</h2>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base text-slate-500">Módulos especializados para una gestión integral.</p>
        </div>

        <div className="grid gap-4 sm:gap-8 grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="group relative rounded-2xl border border-slate-100 bg-white p-8 transition-all hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5">
              <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
