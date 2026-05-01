import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { academicoApi } from '../api';

export const PublicEventosPage = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicoApi.obtenerEventos()
      .then(setEventos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <Link to="/inicio" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Calendario de Eventos</h1>
        <p className="text-slate-500">Explora todos los eventos institucionales programados.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />)
        ) : eventos.length > 0 ? (
          eventos.map((evento) => (
            <div key={evento.id} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
              <div className="bg-blue-600 p-4 text-white">
                <Calendar className="h-6 w-6 opacity-75" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">{evento.nombre}</h3>
                <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(evento.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {evento.asistentes} personas estimadas
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-slate-500 py-20 italic bg-white rounded-2xl border border-dashed border-slate-200">
            No hay eventos registrados en este momento.
          </p>
        )}
      </div>
    </div>
  );
};
