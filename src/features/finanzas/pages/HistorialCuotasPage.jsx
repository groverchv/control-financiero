import { useState, useEffect, useCallback } from 'react';
import { 
  History, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, PauseCircle, PlayCircle, Clock, 
  User, Phone, Calendar, TrendingUp, AlertTriangle,
  Loader2, RefreshCw
} from 'lucide-react';
import { finanzasApi } from '../api';
import { Button, Spinner, Modal, ExportButtons } from '../../../components/ui';
import { Toast } from '../../../components/feedback';

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const MiembroRow = ({ registro }) => {
  const [expanded, setExpanded] = useState(false);
  const { miembro, cronograma, mesesPagados, proximaPendiente } = registro;

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
            <div className="bg-white rounded-lg border border-slate-100 p-3 text-center shadow-sm">
              <Clock className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Próxima cuota</p>
              <p className="text-sm font-semibold text-slate-800">
                {proximaPendiente 
                  ? new Date(proximaPendiente.fechaVencimientoAjustada + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                  : 'Al día ✓'}
              </p>
            </div>
          </div>

          {/* Cronograma mensual */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Cronograma de cuotas de membresía
            </p>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2 min-w-max">
                {cronograma.map((c, idx) => {
                  let labelPrincipal;
                  let labelSecundario;
                  
                  if (c.mes.includes('-') && !c.mes.startsWith('T')) {
                    const [year, month] = c.mes.split('-').map(Number);
                    labelPrincipal = MESES_ES[month - 1];
                    labelSecundario = year.toString();
                  } else {
                    labelPrincipal = c.mes;
                    labelSecundario = '';
                  }

                  return (
                    <div 
                      key={c.mes + '-' + idx} 
                      title={c.pagado ? `Pagado el ${c.fecha_pago ? new Date(c.fecha_pago + 'T00:00:00').toLocaleDateString('es-ES') : '—'}\nMonto: Bs. ${c.monto_pagado}` : `Pendiente — Vence: ${new Date(c.fechaVencimientoAjustada + 'T00:00:00').toLocaleDateString('es-ES')}`}
                      className={`flex flex-col items-center justify-center min-w-16 h-16 px-2 rounded-lg border-2 cursor-default transition-all text-center ${
                        c.pagado 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                          : idx === 0 || (idx > 0 && cronograma[idx-1].pagado)
                            ? 'bg-red-50 border-red-400 text-red-800 ring-2 ring-red-300 ring-offset-1'
                            : 'bg-orange-50 border-orange-200 text-orange-800'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase truncate max-w-full">{labelPrincipal}</span>
                      {labelSecundario && <span className="text-xs font-bold">{labelSecundario}</span>}
                      {c.pagado 
                        ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" />
                        : <AlertCircle className="h-4 w-4 mt-0.5 text-red-500" />
                      }
                    </div>
                  );
                })}
                {cronograma.length === 0 && (
                  <p className="text-sm text-slate-400 italic py-4">No hay cuotas generadas aún.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-300 inline-block" /> Pagado</span>
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
  const [historial, setHistorial] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPausa, setLoadingPausa] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDeuda, setFiltroDeuda] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmPausa, setConfirmPausa] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({ frecuencia: 'mes', dias_recordatorio_activos: 5, monto_cuota: 150 });
  const [infoModal, setInfoModal] = useState({ open: false, title: '', message: '', isWarning: false });
  const ITEMS_PER_PAGE = 10;

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cfg] = await Promise.all([
        finanzasApi.obtenerHistorialCuotasMiembro(),
        finanzasApi.obtenerConfiguracionCuotas(),
      ]);
      setHistorial(data);
      setConfig(cfg);
      
      // Sincronizar notificaciones de forma silenciosa en segundo plano
      finanzasApi.sincronizarNotificacionesDeuda(data, cfg);

      if (cfg) {
        setConfigForm({
          frecuencia: cfg.frecuencia || 'mes',
          dias_recordatorio_activos: cfg.dias_recordatorio_activos || 5,
          monto_cuota: cfg.monto_cuota || 150
        });
      }
    } catch (err) {
      setError(err.message || 'Error cargando el historial de cuotas.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { 
    cargarDatos(); 
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [cargarDatos]);

  const ejecutarGuardarConfiguracion = async (e) => {
    e.preventDefault();
    setLoadingPausa(true);
    try {
      // Formatear numéricos antes de guardar
      const payload = {
        ...configForm,
        dias_recordatorio_activos: parseInt(configForm.dias_recordatorio_activos) || 5,
        monto_cuota: parseFloat(configForm.monto_cuota) || 150
      };
      
      const resp = await finanzasApi.actualizarConfiguracionCuotas(payload);
      setConfig(resp);
      await cargarDatos();
      setConfigModal(false);
      
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
      setError('Error al guardar la configuración: ' + err.message);
    } finally {
      setLoadingPausa(false);
    }
  };

  const ejecutarTogglePausa = async () => {
    setLoadingPausa(true);
    try {
      const nuevaConfig = await finanzasApi.togglePausaCuotas(!config?.pausado, config);
      setConfig(nuevaConfig);
      await cargarDatos();
      setConfirmPausa(false);
    } catch (err) {
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          
          {/* BOTÓN CONFIGURACIÓN GENERAL DE CUOTAS */}
          <button
            type="button"
            onClick={() => {
              setConfigForm({
                frecuencia: config?.frecuencia || 'mes',
                dias_recordatorio_activos: config?.dias_recordatorio_activos || 5,
                monto_cuota: config?.monto_cuota || 150
              });
              setConfigModal(true);
            }}
            disabled={loading || loadingPausa}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Clock className="h-4 w-4 text-slate-500" />
            Configurar Frecuencia
          </button>

          {/* BOTÓN PAUSA GLOBAL */}
          <button
            type="button"
            onClick={() => setConfirmPausa(true)}
            disabled={loadingPausa || loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-sm disabled:opacity-60 ${
              config?.pausado
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
            }`}
          >
            {loadingPausa ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : config?.pausado ? (
              <PlayCircle className="h-4 w-4" />
            ) : (
              <PauseCircle className="h-4 w-4" />
            )}
            {config?.pausado ? 'Reanudar generación de cuotas' : 'Pausar generación de cuotas'}
          </button>
        </div>
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
              {config.dias_pausados > 0 && ` Días de pausa acumulados anteriores: ${config.dias_pausados}.`}
              {' '}Al reanudar, los días adicionales se suman automáticamente a todas las fechas.
            </p>
          </div>
        </div>
      )}

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total miembros', value: totalMiembros, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Al día', value: alDia, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Con deuda', value: conDeuda, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Cuotas pendientes', value: totalCuotasPendientes, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
            <div className={`h-10 w-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros y Exportación */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
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
      </div>

      {/* Lista */}
      <section className="space-y-3">
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
            <p className="text-xs text-slate-500 font-medium">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtrado.length)} de {filtrado.length} miembros
            </p>
            {paginado.map(registro => (
              <MiembroRow key={registro.miembro.id} registro={registro} />
            ))}
          </>
        )}
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
                <option value="3_minutos">Cada 3 min (Pruebas)</option>
                <option value="1_dia">Cada 1 día (Pruebas / Diario)</option>
                <option value="2_dias">Cada 2 días</option>
                <option value="3_dias">Cada 3 días</option>
                <option value="semana">Cada Semana</option>
                <option value="mes">Cada Mes (Estándar)</option>
                <option value="trimestre">Cada Trimestre (Tres Meses)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Determina el intervalo de tiempo entre cada cuota generada para los miembros.
              </p>
            </div>

            {/* Campo Recordatorio Activos */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Días de Recordatorio (Actividades)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={configForm.dias_recordatorio_activos || ''}
                onChange={e => setConfigForm(prev => ({ ...prev, dias_recordatorio_activos: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Anticipación en días para enviar alertas previas antes del inicio de una actividad.
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
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700 leading-relaxed">
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
          <div className={`p-4 rounded-xl border ${config?.pausado ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
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

    </div>
  );
};
