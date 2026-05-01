import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTalentos } from '../hooks';
import { Button, Input, Spinner } from '../../../components/ui';
import { Toast } from '../../../components/feedback';

export const BuscadorTalentoPage = () => {
  const [criterio, setCriterio] = useState('');
  const { talentos, loading, error } = useTalentos(criterio);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Buscador de talento profesional</h1>
        <p className="text-sm text-slate-500">Explora perfiles academicos y profesionales.</p>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Busqueda</h2>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            className="flex-1"
            placeholder="Especialidad, area o experiencia"
            value={criterio}
            onChange={(event) => setCriterio(event.target.value)}
          />
          <Button type="button">Buscar</Button>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Buscando talento...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : talentos.length === 0 ? (
            <p className="text-sm text-slate-500">No hay resultados con ese criterio.</p>
          ) : (
            talentos.map((talento) => (
              <div key={talento.id} className="rounded-md border border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{talento.nombre}</p>
                <p className="text-sm text-slate-500">{talento.especialidad} · {talento.experiencia} anos</p>
                <p className="text-xs text-slate-400">{talento.email}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
