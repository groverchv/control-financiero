import { ArrowRight, CalendarDays, ClipboardList, CreditCard } from 'lucide-react';

const quickActions = [
  {
    title: 'Historial de cuotas',
    description: 'Revisa pagos realizados y pendientes.',
    icon: CreditCard,
  },
  {
    title: 'Actividades academicas',
    description: 'Agenda de eventos y cursos disponibles.',
    icon: CalendarDays,
  },
  {
    title: 'Solicitudes y tramites',
    description: 'Gestiona solicitudes desde el portal.',
    icon: ClipboardList,
  },
];

export const PortalSocioPage = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Portal personal</h1>
        <p className="text-sm text-slate-500">Resumen de tu actividad institucional.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <div key={action.title} className="rounded-md bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                  <p className="text-sm text-slate-500">{action.description}</p>
                </div>
              </div>
              <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700" type="button">
                Ver detalle
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </section>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Mensajes recientes</h2>
        <p className="mt-2 text-sm text-slate-500">No hay mensajes nuevos.</p>
      </section>
    </div>
  );
};
