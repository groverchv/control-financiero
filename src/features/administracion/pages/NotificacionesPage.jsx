import { Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../services/supabase';

export const NotificacionesPage = () => {
  const { user } = useAuthStore();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotificaciones = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('notificacion')
          .select('*')
          .eq('miembro_id', user.id)
          .order('creacion', { ascending: false });

        if (error) throw error;
        setNotificaciones(data || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificaciones();
  }, [user]);

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notificacion')
        .update({ estado: 'leida' })
        .eq('id', id);
      
      if (error) throw error;
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, estado: 'leida' } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const getIcon = (severidad) => {
    // Note: The new schema doesn't have a 'severidad' column in 'notificacion'.
    // I'll default to Info or check if I should add it. 
    // Since it's missing, I'll just use a generic icon or Bell.
    return <Bell className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Notificaciones</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Mantente al tanto de tus actividades y estados financieros.</p>
        </div>
        <div className="bg-blue-100 p-2.5 sm:p-3 rounded-2xl shrink-0">
          <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 font-medium">Cargando tus notificaciones...</p>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No hay notificaciones</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              Te avisaremos cuando haya actualizaciones importantes.
            </p>
          </div>
        ) : (
          notificaciones.map((notif) => (
            <div 
              key={notif.id} 
              className={`group relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md hover:translate-y-[-2px] ${notif.estado !== 'leida' ? 'border-blue-200 bg-blue-50/20' : 'border-slate-100'}`}
            >
              {notif.estado !== 'leida' && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
              )}
              <div className="flex gap-3 sm:gap-5">
                <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${notif.estado !== 'leida' ? 'bg-blue-100/50' : 'bg-slate-100'}`}>
                  {getIcon()}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                    <h3 className={`text-base sm:text-lg font-bold ${notif.estado !== 'leida' ? 'text-slate-900' : 'text-slate-700'}`}>{notif.titulo}</h3>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full w-fit shrink-0">
                      {new Date(notif.creacion).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">{notif.descripcion}</p>
                  {notif.estado !== 'leida' && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Marcar como leída
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
