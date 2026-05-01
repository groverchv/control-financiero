import { AlertTriangle, Bell } from 'lucide-react';
import { useAlertas } from '../hooks';
import { Toast } from '../../../components/feedback';

const severityStyles = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-red-100 text-red-700',
};

export const AlertasPage = () => {
  const { alertas, loading, error } = useAlertas();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Alertas automaticas</h1>
          <p className="text-sm text-slate-500">Notificaciones generadas por reglas del sistema.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <Bell className="h-4 w-4" />
          {alertas.length} alertas activas
        </div>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando alertas...</p>
        ) : error ? (
          <Toast title="Error" message={error} variant="error" />
        ) : alertas.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-slate-500" />
            <p className="text-sm text-slate-600">No hay alertas registradas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <div key={alerta.id} className="rounded-md border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{alerta.titulo}</p>
                    <p className="text-sm text-slate-500">{alerta.descripcion}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${severityStyles[alerta.severidad] || severityStyles.baja}`}>
                    {alerta.severidad}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{alerta.fecha}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
