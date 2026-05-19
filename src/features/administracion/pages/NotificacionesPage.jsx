import { useState, useEffect } from 'react';
import { Landmark, Clock, RefreshCw, CheckCheck, AlertTriangle, CalendarClock } from 'lucide-react';
import { supabase } from '../../../services/supabase';

/**
 * Página de notificaciones administrativas.
 * Solo muestra alertas de cuotas pendientes del plan de amortización de activos.
 * El administrador debe registrar el egreso correspondiente en el módulo de Egresos.
 */
export const NotificacionesPage = () => {
  const [amortizacionAlerts, setAmortizacionAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!cancelled && !refreshing) setLoading(true);
        const { data: config } = await supabase
          .from('configuracion_cuotas')
          .select('dias_recordatorio_activos')
          .limit(1)
          .maybeSingle();
        const diasAviso = config?.dias_recordatorio_activos || 5;

        const { data: planes } = await supabase
          .from('plan_amortizacion')
          .select('*')
          .eq('estado', 'pendiente')
          .order('fechaVencimiento', { ascending: true });

        const { data: activosData } = await supabase
          .from('activos')
          .select('id, nombre');

        if (cancelled) return;

        const hoy = new Date();
        const todas = (planes || []).map(p => {
          const fechaVenc = new Date(p.fechaVencimiento);
          const diffDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
          const activoNombre = activosData?.find(a => a.id === p.activoId)?.nombre || 'Activo desconocido';
          return { ...p, diffDias, activoNombre, fechaVenc };
        });

        // Mostrar las próximas al vencimiento (dentro de diasAviso) y también las vencidas
        const alertas = todas.filter(p => p.diffDias <= diasAviso);
        setAmortizacionAlerts(alertas);
      } catch (err) {
        console.error('[NotificacionesPage] Error cargando datos de amortización:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [retryKey, refreshing]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRetryKey(k => k + 1);
  };

  const totalVencidas = amortizacionAlerts.filter(a => a.diffDias < 0).length;
  const totalProximas = amortizacionAlerts.filter(a => a.diffDias >= 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Notificaciones Administrativas
            </h1>
            {amortizacionAlerts.length > 0 && (
              <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-2.5 rounded-full bg-red-500 text-white text-sm font-bold shadow">
                {amortizacionAlerts.length}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            Recordatorios de pagos de egresos por planes de amortización de activos institucionales.
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

      {/* Resumen de estado — solo visible cuando hay alertas reales */}
      {!loading && amortizacionAlerts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalVencidas}</p>
              <p className="text-xs text-slate-500 font-medium">Vencidas</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalProximas}</p>
              <p className="text-xs text-slate-500 font-medium">Próximas</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{amortizacionAlerts.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total pendientes</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de alertas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
          <p className="text-slate-500 font-medium">Verificando planes de amortización...</p>
        </div>
      ) : amortizacionAlerts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
          <div className="bg-emerald-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCheck className="h-10 w-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Todo al día</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm">
            No hay cuotas de amortización de activos próximas a vencer o vencidas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Cuotas de amortización que requieren un egreso
          </p>
          {amortizacionAlerts.map((alerta, idx) => {
            const isVencido = alerta.diffDias < 0;
            const isUrgente = alerta.diffDias >= 0 && alerta.diffDias <= 2;

            return (
              <div
                key={`amor-${idx}`}
                className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-md ${
                  isVencido ? 'bg-red-50 border-red-200' :
                  isUrgente ? 'bg-amber-50 border-amber-200' :
                  'bg-yellow-50 border-yellow-100'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-2xl ${
                  isVencido ? 'bg-red-500' : isUrgente ? 'bg-amber-500' : 'bg-yellow-400'
                }`} />

                <div className="flex gap-4 items-start pl-3">
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                    isVencido ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    <Landmark className={`h-5 w-5 ${isVencido ? 'text-red-600' : 'text-amber-600'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className={`font-bold text-base ${isVencido ? 'text-red-900' : 'text-amber-900'}`}>
                        {alerta.activoNombre} — Cuota #{alerta.numero}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isVencido ? 'bg-red-200 text-red-800' :
                        isUrgente ? 'bg-amber-200 text-amber-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {isVencido
                          ? `Vencida hace ${Math.abs(alerta.diffDias)} día${Math.abs(alerta.diffDias) !== 1 ? 's' : ''}`
                          : isUrgente ? '¡Urgente! Vence pronto'
                          : `Vence en ${alerta.diffDias} días`}
                      </span>
                    </div>

                    <p className={`text-sm leading-relaxed ${isVencido ? 'text-red-700' : 'text-amber-700'}`}>
                      Debe registrar un <strong>egreso</strong> de{' '}
                      <strong className="text-base">Bs. {Number(alerta.monto).toFixed(2)}</strong>{' '}
                      por el plan de amortización del activo "<strong>{alerta.activoNombre}</strong>".
                      Fecha límite:{' '}
                      <strong>
                        {alerta.fechaVenc.toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </strong>.
                    </p>

                    <a
                      href="/admin/egresos"
                      className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                        isVencido
                          ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-200'
                          : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200'
                      }`}
                    >
                      Ir a Egresos → Registrar pago de amortización
                    </a>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 shrink-0 mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    {alerta.fechaVenc.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
