import { useState, useEffect } from 'react';
import { Bell, RefreshCw, CheckCircle2, Clock, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../services/supabase';

export const SocioNotificacionesPage = () => {
  const { user } = useAuthStore();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchNotificaciones = async () => {
    if (!user) return;
    try {
      // Buscar miembro ID
      const { data: miembro } = await supabase
        .from('miembro')
        .select('id')
        .eq('correoElectronico', user.email)
        .single();

      if (miembro) {
        const { data, error } = await supabase
          .from('notificacion')
          .select('*')
          .eq('miembro_id', miembro.id)
          .order('creacion', { ascending: false });

        if (error) throw error;
        setNotificaciones(data || []);
      }
    } catch (err) {
      console.error('[SocioNotificaciones] Error al cargar notificaciones:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotificaciones();
  };

  const marcarComoLeida = async (id) => {
    try {
      await supabase
        .from('notificacion')
        .update({ estado: 'leida' })
        .eq('id', id);
      setNotificaciones(prev => 
        prev.map(n => n.id === id ? { ...n, estado: 'leida' } : n)
      );
      // Notificar al layout superior para actualizar el contador inmediatamente
      window.dispatchEvent(new Event('notificacion_leida'));
    } catch (err) {
      console.error('Error al marcar como leída:', err);
    }
  };

  const leidas = notificaciones.filter(n => n.estado === 'leida').length;
  const noLeidas = notificaciones.length - leidas;

  const filteredNotificaciones = notificaciones.filter(notif => {
    const query = searchQuery.toLowerCase();
    return (
      notif.titulo?.toLowerCase().includes(query) ||
      notif.descripcion?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredNotificaciones.length / ITEMS_PER_PAGE);
  const paginatedNotificaciones = filteredNotificaciones.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Notificaciones y Avisos
            </h1>
            {noLeidas > 0 && (
              <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-2.5 rounded-full bg-emerald-500 text-white text-sm font-bold shadow">
                {noLeidas}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            Tus alertas personales, comunicados institucionales y recordatorios.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{noLeidas}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No leídas</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{leidas}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leídas</p>
            </div>
          </div>
        </div>
      )}

      {/* buscador premium */}
      {!loading && notificaciones.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder="Buscar por título o contenido..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Encontrados: <span className="text-slate-950 font-bold">{filteredNotificaciones.length}</span> avisos
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20 text-emerald-600">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredNotificaciones.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {searchQuery ? 'Sin resultados' : 'Todo al día'}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            {searchQuery ? 'Intenta buscar con otros términos.' : 'No tienes notificaciones pendientes en este momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {paginatedNotificaciones.map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-5 flex gap-4 transition-colors hover:bg-slate-50 ${
                    notif.estado !== 'leida' ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    notif.estado !== 'leida' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {notif.titulo.toLowerCase().includes('pago') || notif.titulo.toLowerCase().includes('cuota') 
                      ? <AlertCircle className="h-5 w-5" /> 
                      : <Bell className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-bold ${notif.estado !== 'leida' ? 'text-slate-900' : 'text-slate-700'}`}>
                        {notif.titulo}
                      </h4>
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {notif.descripcion}
                    </p>
                    
                    {notif.estado !== 'leida' && (
                      <button 
                        onClick={() => marcarComoLeida(notif.id)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* paginacion responsive */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">
                Mostrando <span className="font-semibold text-slate-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a <span className="font-semibold text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredNotificaciones.length)}</span> de <span className="font-semibold text-slate-900">{filteredNotificaciones.length}</span> avisos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
