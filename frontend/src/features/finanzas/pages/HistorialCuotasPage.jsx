import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, PauseCircle, PlayCircle, Clock, 
  User, Phone, Calendar, TrendingUp, AlertTriangle,
  Loader2, RefreshCw, DollarSign
} from 'lucide-react';
import { finanzasApi } from '../api';
import { Button, Spinner, Modal, ExportButtons } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { formatCurrency } from '../../../utils/formatters';
import { useAuthStore } from '../../../store/authStore';



const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CountdownTimer = ({ targetDate, pausado, fechaPausa }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;

    const calculateTime = () => {
      const now = pausado && fechaPausa ? new Date(fechaPausa) : new Date();
      const difference = +new Date(targetDate) - +now;
      if (difference <= 0) {
        setTimeLeft('Generando...');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      setTimeLeft(formatted);
    };

    calculateTime();
    
    if (pausado) return;

    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, pausado, fechaPausa]);

  return (
    <div className={`mt-1 flex items-center justify-center gap-1 text-[11px] font-mono font-black rounded-md px-1.5 py-0.5 whitespace-nowrap shadow-sm ${
      pausado 
        ? 'text-amber-600 bg-amber-50 border border-amber-100 animate-pulse'
        : 'text-rose-600 bg-rose-50 border border-rose-100'
    }`}>
      <span>{timeLeft} {pausado && '⏸'}</span>
    </div>
  );
};

const formatDiasPausados = (dias) => {
  if (!dias || dias <= 0) return '';
  const totalMinutos = Math.round(dias * 24 * 60);
  if (totalMinutos < 60) {
    return `${totalMinutos} minuto${totalMinutos !== 1 ? 's' : ''}`;
  }
  const horas = Math.floor(totalMinutos / 60);
  const mins = totalMinutos % 60;
  if (horas < 24) {
    return `${horas} hora${horas !== 1 ? 's' : ''}${mins > 0 ? ` y ${mins} min` : ''}`;
  }
  const diasEnteros = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  return `${diasEnteros} día${diasEnteros !== 1 ? 's' : ''}${horasRestantes > 0 ? ` y ${horasRestantes} hora${horasRestantes !== 1 ? 's' : ''}` : ''}`;
};

const MiembroRow = ({ registro }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { miembro, cronograma, mesesPagados, fechaProximaCuota, pausado, fechaPausa } = registro;

  const nombreCompleto = `${miembro.nombre} ${miembro.apellidoPaterno || ''} ${miembro.apellidoMaterno || ''}`.trim();
  const deudaTotal = cronograma.filter(c => !c.pagado).length;
  const porcentajePago = cronograma.length > 0 
    ? Math.round((mesesPagados / cronograma.length) * 100) 
    : 100;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-shadow hover:shadow-md">
      {/* Header Row */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
          {miembro.nombre?.charAt(0)}{miembro.apellidoPaterno?.charAt(0) || ''}
        </div>

        {/* Nombre y datos */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{nombreCompleto}</p>
          <p className="text-xs text-slate-500 truncate">{miembro.correoElectronico}</p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 text-center shrink-0">
          <div>
            <p className="text-lg font-bold text-emerald-600">{mesesPagados}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pagados</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${deudaTotal > 0 ? 'text-red-600' : 'text-slate-400'}`}>{deudaTotal}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Deuda</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700">{cronograma.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="hidden md:block w-24 shrink-0">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${porcentajePago}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-1">{porcentajePago}% al día</p>
        </div>

        {/* Estado deuda */}
        {deudaTotal > 0 ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 text-xs font-bold shrink-0">
            <AlertTriangle className="h-3 w-3" />
            Debe {deudaTotal} {deudaTotal === 1 ? 'cuota' : 'cuotas'}
          </span>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-xs font-bold shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            Al día
          </span>
        )}

        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>

      {/* Expanded Timeline */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-lg border border-slate-100 p-3 text-center shadow-sm">
              <User className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Rol</p>
              <p className="text-sm font-semibold text-slate-800 capitalize">{miembro.rol || '—'}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-100 p-3 text-center shadow-sm">
              <Phone className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Teléfono</p>
              <p className="text-sm font-semibold text-slate-800">{miembro.telefono || '—'}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-100 p-3 text-center shadow-sm">
              <Calendar className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Miembro desde</p>
              <p className="text-sm font-semibold text-slate-800">
                {new Date(miembro.creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-100 p-3 text-center shadow-sm flex flex-col justify-between min-h-[105px]">
              <div>
                <Clock className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Próxima cuota</p>
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {miembro.estado === 'inactivo' ? (
                    <span className="text-amber-600 font-bold">Pausado ⏸</span>
                  ) : fechaProximaCuota ? (
                    new Date(fechaProximaCuota).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  ) : (
                    'Al día ✓'
                  )}
                </p>
              </div>
              {miembro.estado === 'inactivo' ? (
                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-mono font-black rounded-md px-1.5 py-0.5 whitespace-nowrap shadow-sm text-amber-600 bg-amber-50 border border-amber-100">
                  <span>Socio Inactivo</span>
                </div>
              ) : fechaProximaCuota && (
                <CountdownTimer 
                  targetDate={fechaProximaCuota} 
                  pausado={pausado} 
                  fechaPausa={fechaPausa} 
                />
              )}

            </div>
          </div>

          {/* Cronograma mensual */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Cronograma de cuotas de membresía
            </p>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-2 min-w-max">
                {cronograma.filter(c => !c.pagado).map((c, idx) => {
                  let labelPrincipal;
                  let labelSecundario;

                  if (c.mes.startsWith('Día ')) {
                    const datePart = c.mes.substring(4);
                    const [year, month, day] = datePart.split('-').map(Number);
                    labelPrincipal = `${day} ${MESES_ES[month - 1]}`;
                    labelSecundario = year.toString();
                  } else if (c.mes.includes('-') && !c.mes.startsWith('T')) {
                    const [year, month] = c.mes.split('-').map(Number);
                    labelPrincipal = MESES_ES[month - 1];
                    labelSecundario = year.toString();
                  } else {
                    labelPrincipal = c.mes;
                    labelSecundario = '';
                  }

                  const fechaGen = c.creacion ? new Date(c.creacion) : null;
                  const fechaGenStr = fechaGen
                    ? fechaGen.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
                      fechaGen.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : '—';

                  return (
                    <div 
                      key={c.mes + '-' + idx} 
                      title={`Pendiente — Generada: ${fechaGenStr}`}
                      className={`flex flex-col items-center justify-center min-w-[125px] h-28 px-3 py-2 rounded-xl border-2 transition-all text-center relative group ${
                        idx === 0
                          ? 'bg-red-50 border-red-400 text-red-800 ring-2 ring-red-300 ring-offset-1 shadow-sm hover:shadow-md box-red-ring'
                          : 'bg-orange-50 border-orange-200 text-orange-800 shadow-sm hover:shadow-md box-orange'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase truncate max-w-full">{labelPrincipal}</span>
                      {labelSecundario && <span className="text-xs font-bold leading-none mt-0.5">{labelSecundario}</span>}
                      <div className="flex items-center gap-1.5 mt-1">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="text-xs font-black tracking-tight">
                          {formatCurrency(c.monto_esperado || 20)}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold mt-1">
                        {fechaGenStr}
                      </span>
                      
                      {idx === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/admin/ingresos', {
                              state: {
                                autoOpenCreate: true,
                                isCuota: true,
                                socioId: miembro.id,
                                socioNombre: nombreCompleto,
                                socioCorreo: miembro.correoElectronico,
                                monto: c.monto_esperado || 20,
                                descripcion: `Cuota de membresía correspondiente a ${labelPrincipal} ${labelSecundario}`.trim()
                              }
                            });
                          }}
                          className={`absolute -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 text-xs px-2 py-1 rounded-full shadow flex items-center gap-1 hover:bg-slate-50 hover:text-indigo-600 font-semibold z-10`}
                        >
                          <DollarSign className="w-3 h-3" /> Pagar ahora
                        </button>
                      )}
                    </div>
                  );
                })}
                {cronograma.filter(c => !c.pagado).length === 0 && (
                  <p className="text-sm text-slate-400 italic py-4">No hay cuotas pendientes. ¡Al día! ✓</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-400 inline-block" /> Pendiente prioritario</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-orange-300 inline-block" /> Pendiente</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const HistorialCuotasPage = () => {
  const { user } = useAuthStore();
  const [historial, setHistorial] = useState([]);
  const [config, setConfig] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingPausa, setLoadingPausa] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDeuda, setFiltroDeuda] = useState('todos');
  const [confirmPausa, setConfirmPausa] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({ frecuencia: 'mes', monto_cuota: 20 });
  const [infoModal, setInfoModal] = useState({ open: false, title: '', message: '', isWarning: false });
  const [loadingModal, setLoadingModal] = useState({ open: false, text: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const cargarDatos = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [data, cfg] = await Promise.all([
        finanzasApi.obtenerHistorialCuotasMiembro(force),
        finanzasApi.obtenerConfiguracionCuotas(),
      ]);
      setHistorial(data);
      setConfig(cfg);
      
      // Sincronizar notificaciones de forma silenciosa en segundo plano
      finanzasApi.sincronizarNotificacionesDeuda(data, cfg);

      if (cfg) {
        setConfigForm({
          frecuencia: cfg.frecuencia || 'mes',
          monto_cuota: cfg.monto_cuota || 20
        });
      }
    } catch (err) {
      setError(err.message || 'Error cargando el historial de cuotas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos(); 
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [cargarDatos]);

  const ejecutarGuardarConfiguracion = async (e) => {
    e.preventDefault();
    setLoadingPausa(true);
    setLoadingModal({ open: true, text: 'Guardando configuración general...' });
    try {
      // Formatear numéricos antes de guardar
      const payload = {
        ...configForm,
        monto_cuota: parseFloat(configForm.monto_cuota) || 20
      };
      
      const resp = await finanzasApi.actualizarConfiguracionCuotas(payload);
      setConfig(resp);
      await cargarDatos(true);
      setConfigModal(false);
      setLoadingModal({ open: false, text: '' });
      
      if (resp?._schemaWarning) {
        setInfoModal({
          open: true,
          title: "Configuración guardada (Advertencia)",
          message: "Configuración guardada exitosamente.\n\nNota: Para aplicar el cambio de frecuencia en su base de datos, ejecute el script setup.sql en su panel SQL Editor de Supabase.",
          isWarning: true
        });
      } else {
        setInfoModal({
          open: true,
          title: "¡Éxito!",
          message: "Configuración guardada correctamente.",
          isWarning: false
        });
      }
    } catch (err) {
      setLoadingModal({ open: false, text: '' });
      setError('Error al guardar la configuración: ' + err.message);
    } finally {
      setLoadingPausa(false);
    }
  };

  const ejecutarTogglePausa = async () => {
    setConfirmPausa(false);
    setLoadingPausa(true);
    setLoadingModal({
      open: true,
      text: config?.pausado ? 'Reanudando generación de cuotas...' : 'Pausando generación de cuotas...'
    });
    try {
      const nuevaConfig = await finanzasApi.togglePausaCuotas(!config?.pausado, config);
      setConfig(nuevaConfig);
      await cargarDatos(true);
      setLoadingModal({ open: false, text: '' });
      setInfoModal({
        open: true,
        title: config?.pausado ? '¡Generación Reanudada!' : '¡Generación Pausada!',
        message: config?.pausado 
          ? 'El cronograma automático de cuotas se ha reactivado y se reanudará la facturación de todos los socios activos.'
          : 'El cronograma automático ha sido pausado. Ningún socio generará nuevas deudas hasta que reanude el sistema.',
        isWarning: !config?.pausado
      });
    } catch (err) {
      setLoadingModal({ open: false, text: '' });
      setError('Error al cambiar estado de pausa: ' + err.message);
    } finally {
      setLoadingPausa(false);
    }
  };

  // Filtros
  const filtrado = historial.filter(r => {
    const nombre = `${r.miembro.nombre} ${r.miembro.apellidoPaterno || ''} ${r.miembro.apellidoMaterno || ''} ${r.miembro.correoElectronico}`.toLowerCase();
    const matchSearch = nombre.includes(searchTerm.toLowerCase());
    const matchDeuda = filtroDeuda === 'todos' ? true : filtroDeuda === 'deuda' ? r.mesesDeuda > 0 : r.mesesDeuda === 0;
    return matchSearch && matchDeuda;
  });

  const totalPages = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = filtrado.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Estadísticas globales
  const totalMiembros = historial.length;
  const conDeuda = historial.filter(r => r.mesesDeuda > 0).length;
  const alDia = historial.filter(r => r.mesesDeuda === 0).length;
  const totalCuotasPendientes = historial.reduce((acc, r) => acc + r.mesesDeuda, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Historial de Cuotas de Membresía</h1>
          <p className="text-sm text-slate-500">
            Seguimiento mensual de pagos por miembro · Sistema automático desde la fecha de ingreso.
          </p>
        </div>
        {user?.rol === 'admin' && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* BOTÓN CONFIGURACIÓN GENERAL DE CUOTAS */}
            <button
              type="button"
              onClick={() => {
                setConfigForm({
                  frecuencia: config?.frecuencia || 'mes',
                  monto_cuota: config?.monto_cuota || 20
                });
                setConfigModal(true);
              }}
              disabled={loading || loadingPausa}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Clock className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">Configuración de cuotas</span>
            </button>

            {/* BOTÓN PAUSA GLOBAL */}
            <button
              type="button"
              onClick={() => setConfirmPausa(true)}
              disabled={loadingPausa || loading}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-sm disabled:opacity-60 ${
                config?.pausado
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
              }`}
            >
              {loadingPausa ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : config?.pausado ? (
                <PlayCircle className="h-4 w-4 shrink-0" />
              ) : (
                <PauseCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{config?.pausado ? 'Reanudar generación' : 'Pausar generación'}</span>
            </button>
          </div>
        )}
      </header>

      {/* Banner de pausa activa */}
      {config?.pausado && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <PauseCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Generación de cuotas en PAUSA</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Las fechas de vencimiento de todos los miembros están detenidas desde el{' '}
              <strong>{config.fecha_pausa ? new Date(config.fecha_pausa).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' }) : '—'}</strong>.
              {config.dias_pausados > 0 && ` Tiempo de pausa acumulado anterior: ${formatDiasPausados(config.dias_pausados)}.`}
              {' '}Al reanudar, los días adicionales se suman automáticamente a todas las fechas.
            </p>
          </div>
        </div>
      )}

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total miembros', value: totalMiembros, icon: User, color: 'text-blue-600', bg: 'bg-blue-50', valueColor: 'text-slate-900' },
          { label: 'Al día', value: alDia, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', valueColor: 'text-emerald-600' },
          { label: 'Con deuda', value: conDeuda, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', valueColor: 'text-red-600' },
          { label: 'Cuotas pendientes', value: totalCuotasPendientes, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', valueColor: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color, bg, valueColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
            <div className={`h-12 w-12 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xl font-black ${valueColor} truncate`}>{value}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Estado mensual de cuotas
            </h2>
          </div>
          <button
            type="button"
            onClick={() => cargarDatos(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 flex-1 w-full max-w-2xl">
            <ExportButtons 
              data={filtrado.map(r => ({
                Nombre: r.miembro.nombre,
                Apellidos: `${r.miembro.apellidoPaterno || ''} ${r.miembro.apellidoMaterno || ''}`.trim(),
                Correo: r.miembro.correoElectronico,
                Telefono: r.miembro.telefono,
                Rol: r.miembro.rol,
                Estado: r.mesesDeuda > 0 ? 'Con deuda' : 'Al día',
                MesesPagados: r.mesesPagados,
                MesesDeuda: r.mesesDeuda,
                CuotasGeneradas: r.cronograma.length
              }))}
              filename="historial_cuotas_miembros"
              title="Historial de Cuotas de Membresía"
            />
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm bg-white">
              {[['todos','Todos'],['aldia','Al día'],['deuda','Con deuda']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setFiltroDeuda(val); setCurrentPage(1); }}
                  className={`px-4 py-2 font-medium transition-colors ${filtroDeuda === val ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <span className="text-sm text-slate-500 whitespace-nowrap">{filtrado.length} registros</span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
              <Spinner size="md" />
              <span className="text-sm">Calculando cronogramas de cuotas...</span>
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : paginado.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron miembros con los filtros seleccionados.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 font-medium mb-3">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtrado.length)} de {filtrado.length} miembros
              </p>
              {paginado.map(registro => (
                <MiembroRow key={registro.miembro.id} registro={registro} />
              ))}
            </>
          )}
        </div>
      </section>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Página {currentPage} de {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" className="h-8 px-2 text-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'primary' : 'outline'}
                className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-emerald-600 text-white' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button variant="outline" className="h-8 px-2 text-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Frecuencia y Recordatorios */}
      <Modal
        isOpen={configModal}
        onClose={() => setConfigModal(false)}
        title="Configurar Cuotas de Membresía"
        width="max-w-md"
      >
        <form onSubmit={ejecutarGuardarConfiguracion} className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
            
            {/* Campo Frecuencia */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Frecuencia de las Cuotas
              </label>
              <select
                value={configForm.frecuencia}
                onChange={e => setConfigForm(prev => ({ ...prev, frecuencia: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                 <option value="5_minutos">Cada 5 min (Pruebas)</option>
                <option value="1_dia">Cada Día (Pruebas)</option>
                <option value="mes">Cada Mes (Estándar)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Determina el intervalo de tiempo entre cada cuota generada para los miembros.
              </p>
            </div>


            {/* Campo Monto Cuota */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Monto Base de Cuota (Bs.)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={configForm.monto_cuota || ''}
                onChange={e => setConfigForm(prev => ({ ...prev, monto_cuota: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Monto estandar para generar las nuevas cuotas y enviar las notificaciones de deuda.
              </p>
            </div>

          </div>

          {/* Advertencia o Nota informativa */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700 leading-relaxed box-blue">
            <strong>✓ Conteo de fechas robusto:</strong> Al cambiar la frecuencia, los vencimientos se calcularán dinámicamente desde la fecha de registro original del socio. No se perderá ningún dato histórico ni pagos existentes.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setConfigModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={loadingPausa}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loadingPausa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmación de Pausa */}
      <Modal 
        isOpen={confirmPausa} 
        onClose={() => setConfirmPausa(false)} 
        title={config?.pausado ? "Reanudar generación de cuotas" : "Pausar generación de cuotas"}
        width="max-w-md"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${config?.pausado ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:text-emerald-400 box-emerald' : 'bg-amber-50 border-amber-200 text-amber-800 dark:text-amber-400 box-amber'}`}>
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                {config?.pausado ? <PlayCircle className="h-6 w-6" /> : <PauseCircle className="h-6 w-6" />}
              </div>
              <div>
                <p className="font-semibold text-base mb-1">
                  ¿Estás seguro de {config?.pausado ? 'reanudar' : 'pausar'} la generación de cuotas?
                </p>
                <p className="text-sm opacity-90 leading-relaxed">
                  {config?.pausado 
                    ? "Al reanudar, se calcularán los días que el sistema estuvo pausado y se sumarán automáticamente a las fechas de vencimiento de todos los miembros. Las notificaciones automáticas volverán a enviarse."
                    : "Esta acción detendrá temporalmente el conteo de tiempo para la generación de nuevas cuotas de membresía. Útil en períodos de receso institucional o emergencias. Ningún miembro acumulará nuevas deudas mientras el sistema esté pausado."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setConfirmPausa(false)}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={ejecutarTogglePausa}
              disabled={loadingPausa}
              className={config?.pausado ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600 border-none'}
            >
              {loadingPausa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {config?.pausado ? 'Sí, reanudar ahora' : 'Sí, pausar sistema'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Informativo (reemplazo de alert) */}
      <Modal 
        isOpen={infoModal.open} 
        onClose={() => setInfoModal(prev => ({ ...prev, open: false }))} 
        title={infoModal.title}
        width="max-w-sm"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border flex gap-3 ${infoModal.isWarning ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <div className="shrink-0 mt-0.5">
              {infoModal.isWarning ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{infoModal.message}</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button 
              variant="primary" 
              onClick={() => setInfoModal(prev => ({ ...prev, open: false }))}
            >
              Aceptar
            </Button>
          </div>
        </div>
      </Modal>

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />

    </div>
  );
};
