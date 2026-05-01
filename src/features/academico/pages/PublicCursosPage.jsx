import { useEffect, useState } from 'react';
import { GraduationCap, CalendarDays, ArrowLeft, BookOpen, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { academicoApi } from '../api';

export const PublicCursosPage = () => {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicoApi.obtenerActividades()
      .then(setActividades)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <Link to="/inicio" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Oferta Académica</h1>
        <p className="text-slate-500">Cursos, talleres y capacitaciones disponibles para nuestros miembros.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)
        ) : actividades.length > 0 ? (
          actividades.map((act) => (
            <div key={act.id} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{act.nombre}</h3>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 capitalize">
                  <Tag className="h-3 w-3" />
                  {act.tipo}
                </span>
              </div>

              <div className="mt-auto pt-8 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <CalendarDays className="h-4 w-4" />
                Inicia: {new Date(act.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-slate-500 py-20 italic bg-white rounded-2xl border border-dashed border-slate-200">
            No hay cursos registrados en este momento.
          </p>
        )}
      </div>
    </div>
  );
};
