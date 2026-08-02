import { useState } from 'react';
import { UserCircle, FileText, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Spinner, Modal } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { administracionApi } from '../api';
import { downloadCvFile } from '../../../services/cloudinary';

const ITEMS_PER_PAGE = 10;

const renderFormattedResumen = (text) => {
  if (!text) return "-";
  
  const sections = text.split(/(?=\b[A-Z\u00C0-\u00DC][a-zA-Z\u00C0-\u00DC\s\u00f1\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da-]+:)/g);
  
  if (sections.length > 1) {
    return (
      <div className="space-y-3 mt-1.5">
        {sections.map((sec, idx) => {
          const colonIdx = sec.indexOf(":");
          if (colonIdx !== -1) {
            const title = sec.substring(0, colonIdx).trim();
            const content = sec.substring(colonIdx + 1).trim();
            return (
              <div key={idx} className="flex flex-col md:flex-row md:items-start gap-1 md:gap-4 border-b border-slate-100 dark:border-slate-850 pb-2 last:border-b-0 last:pb-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0 md:w-44 text-[10px] sm:text-xs uppercase tracking-wider bg-slate-50 dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-150 dark:border-slate-800 w-fit">
                  {title}
                </span>
                <p className="text-slate-600 dark:text-slate-350 text-xs sm:text-sm leading-relaxed flex-1">
                  {content}
                </p>
              </div>
            );
          }
          return <p key={idx} className="text-slate-600 dark:text-slate-350 text-xs sm:text-sm leading-relaxed">{sec.trim()}</p>;
        })}
      </div>
    );
  }
  
  return <p className="whitespace-pre-line text-slate-600 dark:text-slate-350 text-xs sm:text-sm leading-relaxed">{text}</p>;
};

const ModalPagination = ({ current, total, onPageChange, filteredCount, label = 'registros' }) => {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 mt-3">
      <p className="text-[10px] text-slate-500">
        Mostrando <span className="font-semibold text-slate-900">{((current - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
        <span className="font-semibold text-slate-900">{Math.min(current * ITEMS_PER_PAGE, filteredCount)}</span> de{' '}
        <span className="font-semibold text-slate-900">{filteredCount}</span> {label}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
          aria-label="Página anterior"
        >
          ‹
        </button>
        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
          {current} / {total}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(total, current + 1))}
          disabled={current === total}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>
    </div>
  );
};

const formatCurrency = (val) => `Bs ${Number(val || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Modal de detalle de miembro con tabs (inscripciones, estado de cuenta, notificaciones, CV).
 * Extraído de GestionMiembrosPage.jsx para mejorar mantenibilidad.
 */
export const MiembroDetailModal = ({
  detailModal,
  setDetailModal,
  globalConfig,
  onImageClick
}) => {
  const [pageDetailCuotas, setPageDetailCuotas] = useState(1);
  const [pageDetailActs, setPageDetailActs] = useState(1);

  // Cuotas
  const totalPagesDetailCuotas = Math.ceil((detailModal.cronograma || []).length / ITEMS_PER_PAGE);
  const paginatedDetailCuotas = (detailModal.cronograma || []).slice((pageDetailCuotas - 1) * ITEMS_PER_PAGE, pageDetailCuotas * ITEMS_PER_PAGE);

  // Actividades
  const filteredDetailActs = (detailModal.inscripcionesCuenta || []).filter(i => i.actividad && Number(i.actividad.costo) > 0);
  const totalPagesDetailActs = Math.ceil(filteredDetailActs.length / ITEMS_PER_PAGE);
  const paginatedDetailActs = filteredDetailActs.slice((pageDetailActs - 1) * ITEMS_PER_PAGE, pageDetailActs * ITEMS_PER_PAGE);

  const cuotasColumns = [
    { key: 'periodo', label: 'Periodo' },
    { key: 'fecha_generacion', label: 'Generación' },
    { key: 'monto_display', label: 'Monto' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const cuotasRows = paginatedDetailCuotas.map((c, idx) => ({
    id: c.mes + '-' + idx,
    periodo: <span className="font-semibold text-slate-800 text-xs">{c.mes}</span>,
    fecha_generacion: <span className="text-xs text-slate-600">{formatDate(c.fechaGeneracion)}</span>,
    monto_display: (
      <span className={`font-bold text-xs ${c.pagado ? 'text-emerald-600' : 'text-red-600'}`}>
        {c.pagado ? formatCurrency(c.monto_pagado || c.monto_esperado) : formatCurrency(c.monto_esperado)}
      </span>
    ),
    estado_display: c.pagado ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <CheckCircle2 className="h-2.5 w-2.5" /> PAGADA
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
        <AlertTriangle className="h-2.5 w-2.5" /> PENDIENTE
      </span>
    ),
  }));

  const actsColumns = [
    { key: 'actividad', label: 'Actividad' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'costo_display', label: 'Costo' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const actsRows = paginatedDetailActs.map((ins, idx) => ({
    id: ins.id || idx,
    actividad: (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800 text-xs">{ins.actividad?.titulo || 'Sin nombre'}</span>
        <span className="text-[9px] text-slate-400">
          {ins.actividad?.fecha ? new Date(ins.actividad.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
        </span>
      </div>
    ),
    tipo: (
      <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 uppercase">
        {ins.actividad?.tipo_actividad?.nombre || 'General'}
      </span>
    ),
    costo_display: (() => {
      const costo = ins.actividad?.costo || 0;
      const totalPaid = ins.ingreso && ins.ingreso.length > 0
        ? ins.ingreso.reduce((sum, ing) => sum + Number(ing.monto || 0), 0)
        : (ins.estado === 'pagado' ? costo : 0);
      const isFullyPaid = totalPaid >= costo || costo === 0;
      const displayMonto = isFullyPaid ? totalPaid : costo;
      return (
        <span className="font-bold text-xs text-slate-800">
          {formatCurrency(displayMonto || 0)}
        </span>
      );
    })(),
    estado_display: (() => {
      const costo = ins.actividad?.costo || 0;
      const totalPaid = ins.ingreso && ins.ingreso.length > 0
        ? ins.ingreso.reduce((sum, ing) => sum + Number(ing.monto || 0), 0)
        : (ins.estado === 'pagado' ? costo : 0);
      const isFullyPaid = totalPaid >= costo || costo === 0;
      
      if (isFullyPaid) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="h-2.5 w-2.5" /> PAGADO
          </span>
        );
      }
      
      if (totalPaid > 0) {
        const remaining = costo - totalPaid;
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
            <AlertTriangle className="h-2.5 w-2.5" /> DEUDA (Resta Bs. {Number(remaining).toFixed(2)})
          </span>
        );
      }
      
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          <AlertTriangle className="h-2.5 w-2.5" /> PENDIENTE
        </span>
      );
    })(),
  }));

  const handleCvUpload = async (file) => {
    if (!file) return;

    const MAX_ALLOWED_SIZE = 10 * 1024 * 1024; // 10MB estricto admitido por Cloudinary
    if (file.size > MAX_ALLOWED_SIZE) {
      alert(`El archivo "${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB y supera el límite de Cloudinary (10 MB). Para evitar hacerte perder tiempo, la subida fue cancelada. Por favor selecciona un archivo de hasta 10 MB.`);
      return;
    }
    try {
      setDetailModal(prev => ({ ...prev, loading: true }));
      await administracionApi.subirArchivo(detailModal.miembro.id, file, 'cv');
      const cvUrl = await administracionApi.obtenerDocumentoMiembro(detailModal.miembro.id);
      setDetailModal(prev => ({ ...prev, cvUrl, loading: false }));
    } catch (err) {
      alert("Error al subir CV: " + err.message);
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <Modal
      isOpen={detailModal.open}
      onClose={() => setDetailModal(prev => ({ ...prev, open: false }))}
      title={`Detalle de: ${detailModal.miembro?.nombre || ''}`}
      id="miembro-detail-modal"
    >
      <div className="space-y-4">
        {/* Cabecera y Detalles unificados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-100/80">
          {/* Foto de Perfil y Nombre */}
          <div className="flex flex-col items-center text-center space-y-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm md:col-span-1 justify-center">
            <div 
              className="h-28 w-28 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-inner group relative cursor-pointer"
              onClick={() => detailModal.miembro?.foto && onImageClick(detailModal.miembro.foto)}
              title="Haga clic para ver foto completa"
            >
              {detailModal.miembro?.foto ? (
                <img 
                  src={detailModal.miembro.foto} 
                  alt="Perfil" 
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" 
                />
              ) : (
                <UserCircle className="h-16 w-16 text-slate-300" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">
                {detailModal.miembro?.nombre}
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {detailModal.miembro?.apellidoPaterno} {detailModal.miembro?.apellidoMaterno}
              </p>
              <span className="inline-block mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100">
                {detailModal.miembro?.rol}
              </span>
            </div>
          </div>

          {/* Datos Personales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2 text-sm">
            <div>
              <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Correo Electrónico</span> 
              <span className="text-slate-800 font-medium break-all">{detailModal.miembro?.email}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Teléfono</span> 
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-medium">{detailModal.miembro?.telefono || '-'}</span>
                {(() => {
                  const raw = (detailModal.miembro?.telefono || '').trim();
                  const digits = raw.replace(/\D/g, '');
                  const waUrl = digits ? `https://wa.me/${digits.length === 8 ? '591' + digits : digits}` : null;
                  if (!waUrl) return null;
                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-xs border border-emerald-200/80 shrink-0"
                      title={`Iniciar chat de WhatsApp con ${detailModal.miembro?.nombre || 'socio'}`}
                      aria-label={`WhatsApp a ${detailModal.miembro?.telefono}`}
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </a>
                  );
                })()}
              </div>
            </div>
            <div>
              <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Carnet de Identidad (CI)</span> 
              <span className="text-slate-800 font-medium">{detailModal.miembro?.ci || '—'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Estado</span> 
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase mt-0.5 ${detailModal.miembro?.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>{detailModal.miembro?.estado}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Fecha de Registro</span> 
              <span className="text-slate-800 font-medium">
                {detailModal.miembro?.creacion 
                  ? new Date(detailModal.miembro.creacion).toLocaleString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) 
                  : '-'}
              </span>
            </div>
            
            <div className="sm:col-span-2 border-t border-slate-200/60 pt-3">
              <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Profesión / Título</span>
              <span className="text-slate-800 font-medium">{detailModal.miembro?.profesion || '-'}</span>
            </div>
            <div className="sm:col-span-2 border-t border-slate-200/60 pt-3">
              <div className="text-slate-800 font-medium leading-relaxed">
                {renderFormattedResumen(detailModal.miembro?.biografia)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200" role="tablist">
          {['inscripciones', 'estado_cuenta', 'notificaciones', 'cv'].map(tab => {
            const labels = {
              inscripciones: `Inscripciones (${detailModal.inscripciones.length})`,
              estado_cuenta: 'Estado de Cuenta',
              notificaciones: 'Notificaciones',
              cv: 'Documento CV'
            };
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={detailModal.tab === tab}
                onClick={() => setDetailModal(prev => ({ ...prev, tab }))}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  detailModal.tab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {labels[tab]}
                {tab === 'notificaciones' && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${detailModal.notificaciones.some(n => n.estado !== 'leida') ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                    {detailModal.notificaciones.filter(n => n.estado !== 'leida').length} sin leer
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {detailModal.loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-500">
            <Spinner size="sm" /> Cargando informacion...
          </div>
        ) : detailModal.tab === 'inscripciones' ? (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {detailModal.inscripciones.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No tiene inscripciones registradas.</p>
            ) : detailModal.inscripciones.map((insc, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{insc.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {insc.tipo === 'evento' ? 'Evento' : 'Actividad Academica'} &mdash; {insc.fecha ? new Date(insc.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${insc.tipo === 'evento' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {insc.tipo === 'evento' ? 'Evento' : 'Curso'}
                </span>
              </div>
            ))}
          </div>
        ) : detailModal.tab === 'notificaciones' ? (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {detailModal.notificaciones.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No tiene notificaciones registradas.</p>
            ) : detailModal.notificaciones.map((notif, i) => (
              <div key={i} className={`rounded-lg px-4 py-3 text-sm border ${notif.estado !== 'leida' ? 'notif-unread bg-blue-50/50 border-blue-200 dark:border-slate-700' : 'notif-read bg-slate-50 border-slate-100 dark:border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {notif.estado !== 'leida' && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                    <p className={`font-semibold ${notif.estado !== 'leida' ? 'text-slate-900 dark:text-white' : 'text-slate-850 dark:text-slate-250'}`}>{notif.titulo}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{notif.creacion ? new Date(notif.creacion).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{notif.descripcion}</p>
              </div>
            ))}
          </div>
        ) : detailModal.tab === 'cv' ? (
          <div className="space-y-4">
            {detailModal.cvUrl ? (
              <div className="flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-3">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> CV CARGADO
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => downloadCvFile(detailModal.cvUrl, detailModal.miembro?.nombre_completo || `${detailModal.miembro?.nombres || ''} ${detailModal.miembro?.apellidos || ''}`.trim())}
                      className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      Descargar CV
                    </button>
                    <a href={detailModal.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:underline flex items-center gap-1">
                      Abrir en nueva pestaña
                    </a>
                  </div>
                </div>
                <iframe 
                  src={detailModal.cvUrl?.toLowerCase().endsWith('.pdf') 
                    ? detailModal.cvUrl 
                    : `https://docs.google.com/gview?url=${encodeURIComponent(detailModal.cvUrl)}&embedded=true`
                  } 
                  className="w-full h-80 border rounded-xl bg-slate-50 shadow-inner" 
                  title="CV del Miembro"
                ></iframe>
                
                {/* Permitir actualizar desde el detalle */}
                <div className="w-full mt-4 p-4 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Actualizar documento CV</p>
                    <p className="text-[10px] text-slate-400">PDF, DOC o DOCX · Máx 10MB</p>
                  </div>
                  <label className="bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-slate-50 hover:border-slate-300 font-bold cursor-pointer transition-all active:scale-95">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    Reemplazar CV
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx" 
                      onChange={(e) => handleCvUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-semibold mb-1">Este profesional aún no tiene cargado su Currículum Vitae.</p>
                <p className="text-xs text-slate-400 mb-4">Puedes adjuntar su documento CV en formato PDF o Word.</p>
                
                <label className="inline-flex bg-blue-600 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 font-bold cursor-pointer transition-all active:scale-95 items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Subir Documento CV
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx" 
                    onChange={(e) => handleCvUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
            )}
          </div>
        ) : detailModal.tab === 'estado_cuenta' ? (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Monto Inscripción</span>
                <span className="text-lg font-black text-slate-700">{formatCurrency(detailModal.miembro?.monto_inscripcion ?? 150)}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cuota Mensual</span>
                <span className="text-lg font-black text-slate-700">{formatCurrency(globalConfig.monto_cuota || 20)}</span>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Deuda Acumulada</span>
                <span className="text-lg font-black text-amber-700">
                  {formatCurrency(
                    detailModal.cronograma.filter(c => !c.pagado).reduce((sum, c) => sum + Number(c.monto_esperado || 0), 0) +
                    detailModal.inscripcionesCuenta.filter(i => i.estado !== 'pagado').reduce((sum, i) => sum + Number(i.actividad?.costo || 0), 0)
                  )}
                </span>
              </div>
            </div>

            {/* Seccion Cuotas */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Cuotas</h4>
                <span className="text-[10px] text-slate-400 font-semibold">{detailModal.cronograma.length} registros</span>
              </div>
              <Table columns={cuotasColumns} rows={cuotasRows} emptyMessage="No hay cuotas registradas." />
              <ModalPagination
                current={pageDetailCuotas}
                total={totalPagesDetailCuotas}
                onPageChange={setPageDetailCuotas}
                filteredCount={detailModal.cronograma.length}
                label="cuotas"
              />
            </div>

            {/* Seccion Actividades */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Actividades</h4>
                <span className="text-[10px] text-slate-400 font-semibold">{filteredDetailActs.length} registros</span>
              </div>
              <Table columns={actsColumns} rows={actsRows} emptyMessage="No hay actividades registradas." />
              <ModalPagination
                current={pageDetailActs}
                total={totalPagesDetailActs}
                onPageChange={setPageDetailActs}
                filteredCount={filteredDetailActs.length}
                label="inscripciones"
              />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
