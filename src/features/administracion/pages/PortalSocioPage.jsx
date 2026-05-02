import { ArrowRight, CalendarDays, ClipboardList, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    title: 'Historial de cuotas',
    description: 'Revisa pagos realizados y pendientes.',
    icon: CreditCard,
    to: '/socio/estado-cuenta',
  },
  {
    title: 'Actividades academicas',
    description: 'Agenda de eventos y cursos disponibles.',
    icon: CalendarDays,
    to: '/eventos',
  },
  {
    title: 'Solicitudes y tramites',
    description: 'Gestiona solicitudes desde el portal.',
    icon: ClipboardList,
    to: '/socio/portal',
  },
];

export const PortalSocioPage = () => {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Portal personal</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1">Resumen de tu actividad institucional.</p>
      </header>

      <section className="grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link 
              key={action.title} 
              to={action.to}
              className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shrink-0">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{action.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{action.description}</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:gap-3 transition-all">
                Ver detalle
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100">
        <h2 className="text-base font-bold text-slate-900">Mensajes recientes</h2>
        <p className="mt-2 text-sm text-slate-500">No hay mensajes nuevos.</p>
      </section>
    </div>
  );
};
