import { Link } from 'react-router-dom';
import { Activity, BadgeCheck, CalendarDays, Layers, Users } from 'lucide-react';

const features = [
  {
    title: 'Administracion centralizada',
    description: 'Gestion de miembros, perfiles y alertas operativas.',
    icon: Users,
  },
  {
    title: 'Finanzas trazables',
    description: 'Control de cuotas, egresos y reportes financieros.',
    icon: Activity,
  },
  {
    title: 'Patrimonio institucional',
    description: 'Registro de activos y amortizacion automatizada.',
    icon: Layers,
  },
  {
    title: 'Gestion academica',
    description: 'Eventos, jurados y talento profesional en un solo lugar.',
    icon: CalendarDays,
  },
];

export const LandingPage = () => {
  return (
    <div className="space-y-12">
      <section className="grid gap-8 rounded-md bg-white p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold text-blue-600">Sistema institucional</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            Gestion institucional moderna y confiable
          </h2>
          <p className="mt-4 text-sm text-slate-500">
            Integra administracion, finanzas, patrimonio y gestion academica en una plataforma
            con control de acceso por roles y trazabilidad completa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Acceder
            </Link>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Solicitar demo
            </button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Seguridad y auditoria</p>
              <p className="text-sm text-slate-500">Acceso controlado y registro de acciones.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-3 rounded-md bg-white p-3 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                    <p className="text-sm text-slate-500">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-md bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Panel administrativo</h3>
          <p className="mt-2 text-sm text-slate-500">
            Herramientas para seguimiento de miembros, alertas y reportes ejecutivos.
          </p>
        </div>
        <div className="rounded-md bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Portal del socio</h3>
          <p className="mt-2 text-sm text-slate-500">
            Acceso rapido al perfil, estado financiero y actividades academicas.
          </p>
        </div>
        <div className="rounded-md bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Modulos conectados</h3>
          <p className="mt-2 text-sm text-slate-500">
            Datos integrados entre finanzas, activos y gestion academica.
          </p>
        </div>
      </section>
    </div>
  );
};
