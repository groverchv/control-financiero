import { useState } from 'react';
import { CalendarPlus, ClipboardList, Edit, Trash2, Camera, X, MapPin, Info, Users, ArrowRight, Tags, ChevronLeft, ChevronRight, Eye, FileType, FileText, FileSpreadsheet, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useActividades, useTiposActividad } from '../hooks';
import { Button, Spinner, Modal, Input, ExportButtons } from '../../../components/ui';
import { MapPicker } from '../../../components/ui/MapPicker';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { academicoApi } from '../api';
import { administracionApi } from '../../administracion/api';
import { useAuthStore } from '../../../store/authStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const GestionActividadesPage = () => {
  const { actividades, loading, error, setActividades } = useActividades();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { tipos } = useTiposActividad();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAct, setEditingAct] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    descripcion: '', 
    fecha: '', 
    hora: '19:00',
    cupos: 0, 
    ubicacion: '', 
    latitud: '',
    longitud: '',
    modalidad: 'presencial',
    costo: 0, 
    requisitos: '',
    incluye_certificacion: false,
    estado: 'programado',
    tipo_actividad_id: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [inscritosModal, setInscritosModal] = useState({ open: false, actividad: null, inscritos: [], loading: false });
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [detalleModal, setDetalleModal] = useState({ open: false, actividad: null });
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  
  // Asistencia & Manual Enrollment States
  const [todosMiembros, setTodosMiembros] = useState([]);
  const [selectedMiembroId, setSelectedMiembroId] = useState('');
  const [manualInscribiendo, setManualInscribiendo] = useState(false);
  const [asistenciaModal, setAsistenciaModal] = useState({
    open: false,
    selectedActividadId: '',
    columns: { nro: true, nombre: true, email: true, telefono: true, firma: true, fecha: false, estado: false },
    loading: false,
    inscritos: []
  });
  
  // Search and dropdown states for Member Selection (Manual Enrollment) and Activity Selection (Asistencia Report)
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [actividadSearchQuery, setActividadSearchQuery] = useState('');
  const [isActividadDropdownOpen, setIsActividadDropdownOpen] = useState(false);

  const columns = [
    { key: 'nro', label: 'Nº' },
    { key: 'imagen_display', label: 'Imagen' },
    { key: 'nombre', label: 'Actividad' },
    { key: 'tipo_nombre', label: 'Tipo' },
    { key: 'fecha_hora', label: 'Fecha/Hora' },
    { key: 'ubicacion_display', label: 'Ubicación' },
    { key: 'cupos', label: 'Cupos' },
    { key: 'acciones', label: 'Acciones' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenCreate = () => {
    setEditingAct(null);
    setFormData({ 
      nombre: '', 
      descripcion: '', 
      fecha: '', 
      hora: '19:00',
      cupos: 0, 
      ubicacion: '', 
      latitud: '',
      longitud: '',
      modalidad: 'presencial',
      costo: 0, 
      requisitos: '',
      incluye_certificacion: false,
      estado: 'programado',
      tipo_actividad_id: tipos[0]?.id || ''
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act) => {
    setEditingAct(act);
    setFormData({ 
      nombre: act.nombre, 
      descripcion: act.descripcion || '',
      fecha: act.fecha, 
      hora: act.hora ? act.hora.substring(0, 5) : '19:00',
      cupos: act.cupos || 0,
      ubicacion: act.ubicacion || '',
      latitud: act.latitud || '',
      longitud: act.longitud || '',
      modalidad: act.modalidad || 'presencial',
      costo: act.costo || 0,
      requisitos: act.requisitos || '',
      incluye_certificacion: act.incluye_certificacion || false,
      estado: act.estado || 'programado',
      tipo_actividad_id: act.tipo_actividad_id || ''
    });
    setSelectedFile(null);
    setPreviewUrl(act.imagen || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta actividad?')) return;
    try {
      await academicoApi.eliminarActividad(id);
      setActividades(actividades.filter(a => a.id !== id));
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Actividad eliminada!',
        details: 'La actividad y sus registros asociados han sido removidos con éxito de la base de datos.'
      });
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al eliminar',
        details: err instanceof Error ? err.message : 'No se pudo eliminar la actividad de la base de datos.'
      });
    }
  };

  const handleVerInscritos = async (act) => {
    setInscritosModal({ open: true, actividad: act, inscritos: [], loading: true });
    setSelectedMiembroId('');
    setMemberSearchQuery('');
    setIsMemberDropdownOpen(false);
    try {
      const [inscritos, miembros] = await Promise.all([
        administracionApi.obtenerInscritosActividad(act.id),
        todosMiembros.length === 0 ? administracionApi.obtenerMiembros() : Promise.resolve(todosMiembros)
      ]);
      setInscritosModal(prev => ({ ...prev, inscritos, loading: false }));
      if (todosMiembros.length === 0) {
        setTodosMiembros(miembros);
      }
    } catch (err) {
      console.error('Error cargando datos de inscritos:', err);
      setInscritosModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleManualInscribir = async (e) => {
    e.preventDefault();
    if (!selectedMiembroId || !inscritosModal.actividad) return;
    setManualInscribiendo(true);
    try {
      await academicoApi.inscribirSocio(selectedMiembroId, inscritosModal.actividad.id);
      // Reload inscritos list
      const nuevosInscritos = await administracionApi.obtenerInscritosActividad(inscritosModal.actividad.id);
      setInscritosModal(prev => ({ ...prev, inscritos: nuevosInscritos }));
      setSelectedMiembroId('');
      // Decrease cupos locally
      setActividades(prev => prev.map(a => a.id === inscritosModal.actividad.id ? { ...a, cupos: Math.max(0, a.cupos - 1) } : a));
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Socio inscrito con éxito!',
        details: 'El socio ha sido inscrito manualmente en la actividad de manera correcta.'
      });
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error de inscripción',
        details: err.message || 'No se pudo completar la inscripción del socio.'
      });
    } finally {
      setManualInscribiendo(false);
    }
  };

  const handleReportActividadChange = async (actId) => {
    setAsistenciaModal(prev => ({ ...prev, selectedActividadId: actId, loading: true, inscritos: [] }));
    if (!actId) {
      setAsistenciaModal(prev => ({ ...prev, loading: false }));
      return;
    }
    try {
      const data = await administracionApi.obtenerInscritosActividad(actId);
      setAsistenciaModal(prev => ({ ...prev, inscritos: data, loading: false }));
    } catch (err) {
      console.error('Error cargando inscritos para reporte:', err);
      setAsistenciaModal(prev => ({ ...prev, loading: false }));
    }
  };

  const executeAsistenciaExport = (format) => {
    const act = actividades.find(a => a.id === asistenciaModal.selectedActividadId);
    if (!act) return;
    
    const { inscritos, columns } = asistenciaModal;
    if (inscritos.length === 0) {
      alert('No hay inscritos en esta actividad para generar el reporte.');
      return;
    }

    // Prepare data based on selected columns
    const reportData = inscritos.map((ins, index) => {
      const row = {};
      if (columns.nro) row['Nº'] = index + 1;
      if (columns.nombre) row['Nombre Completo'] = `${ins.nombre} ${ins.apellidoPaterno || ''} ${ins.apellidoMaterno || ''}`.trim();
      if (columns.email) row['Correo Electrónico'] = ins.email || 'Sin correo';
      if (columns.telefono) row['Teléfono'] = ins.telefono || 'Sin teléfono';
      if (columns.fecha) row['Fecha Inscripción'] = ins.fechaInscripcion ? new Date(ins.fechaInscripcion).toLocaleDateString() : 'Sin registro';
      if (columns.estado) row['Estado'] = ins.estado || 'Activo';
      if (columns.firma) row['Firma / Asistencia'] = '___________________';
      return row;
    });

    const activeHeaders = Object.keys(reportData[0]);

    if (format === 'csv' || format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");
      
      const max_width = reportData.reduce((w, r) => {
        activeHeaders.forEach(key => {
          const v = r[key] ? r[key].toString() : "";
          w[key] = Math.max(w[key] || key.length, v.length);
        });
        return w;
      }, {});
      worksheet['!cols'] = activeHeaders.map(key => ({ wch: max_width[key] + 2 }));
      
      XLSX.writeFile(workbook, `asistencia_${act.nombre.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
    }
    else if (format === 'txt') {
      const txtContent = [
        `PLANILLA DE ASISTENCIA - ${act.nombre.toUpperCase()}`,
        '='.repeat(act.nombre.length + 24),
        `Modalidad: ${act.modalidad.toUpperCase()}`,
        `Fecha de Actividad: ${new Date(act.fecha).toLocaleDateString()}`,
        `Fecha de Reporte: ${new Date().toLocaleString()}`,
        `Total de Alumnos: ${inscritos.length}`,
        '',
        activeHeaders.join('\t'),
        '-'.repeat(activeHeaders.join('\t').length + 10),
        ...reportData.map(row => activeHeaders.map(h => row[h]).join('\t'))
      ].join('\n');
      
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `asistencia_${act.nombre.toLowerCase().replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    else if (format === 'pdf') {
      const doc = new jsPDF({ orientation: activeHeaders.length > 5 ? 'landscape' : 'portrait' });
      
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`Planilla de Asistencia`, 14, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text(`Actividad: ${act.nombre}`, 14, 27);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Fecha: ${new Date(act.fecha).toLocaleDateString()}  |  Hora: ${act.hora?.substring(0,5)}  |  Modalidad: ${act.modalidad.toUpperCase()}`, 14, 34);
      doc.text(`Lugar/Enlace: ${act.ubicacion}  |  Total alumnos inscritos: ${inscritos.length}`, 14, 40);
      
      const tableData = reportData.map(row => activeHeaders.map(h => row[h]));
      
      autoTable(doc, {
        startY: 46,
        head: [activeHeaders.map(h => h.toUpperCase())],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // blue-600 header
        alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50 alternate rows
        styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
          'Nº': { width: 10 },
          'Firma / Asistencia': { width: 45 }
        },
        margin: { top: 46, left: 14, right: 14, bottom: 20 },
        didDrawPage: function (data) {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-400
          const str = 'Página ' + doc.internal.getNumberOfPages();
          const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
          doc.text(str, pageWidth - 14 - doc.getStringUnitWidth(str) * doc.internal.getFontSize() / doc.internal.scaleFactor, doc.internal.pageSize.height - 10);
          doc.text('Control Financiero Académico - Reporte Oficial de Asistencia', 14, doc.internal.pageSize.height - 10);
        }
      });
      
      doc.save(`asistencia_${act.nombre.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    }
    setAsistenciaModal(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData, miembro_id: user?.id };
      if (editingAct) {
        const actualizado = await academicoApi.actualizarActividad(editingAct.id, payload, selectedFile);
        setActividades(actividades.map(a => a.id === editingAct.id ? actualizado : a));
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Actividad actualizada!',
          details: 'Los cambios y detalles de la actividad académica han sido guardados con éxito.'
        });
      } else {
        const nuevaAct = await academicoApi.crearActividad(payload, selectedFile);
        setActividades([nuevaAct, ...actividades]);
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Actividad creada!',
          details: 'La nueva actividad académica ha sido registrada e integrada en el cronograma institucional.'
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al guardar actividad',
        details: err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(actividades.length / ITEMS_PER_PAGE);
  const paginatedActividades = actividades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const rows = paginatedActividades.map((act, index) => ({
    ...act,
    nro: <span className="font-bold text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</span>,
    fecha_hora: (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900">{new Date(act.fecha).toLocaleDateString()}</span>
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{act.hora?.substring(0, 5) || '--:--'}</span>
      </div>
    ),
    ubicacion_display: (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 truncate max-w-[150px]">{act.ubicacion || 'Sin ubicación'}</span>
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
          {act.modalidad === 'virtual' ? <Info className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
          {act.modalidad || 'presencial'}
        </span>
      </div>
    ),
    imagen_display: (
      <div 
        className="h-10 w-16 rounded overflow-hidden bg-slate-100 border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => act.imagen && setImageModal({ open: true, url: act.imagen })}
      >
        {act.imagen ? (
          <img src={act.imagen} alt={act.nombre} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">Sin Foto</div>
        )}
      </div>
    ),
    acciones: (
      <div className="flex gap-2 items-center">
        <button 
          onClick={() => setDetalleModal({ open: true, actividad: act })}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          Detalle
        </button>
        <button 
          onClick={() => handleVerInscritos(act)}
          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
          title="Ver inscritos"
        >
          <Users className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleOpenEdit(act)}
          className="rounded p-1 text-amber-600 hover:bg-amber-50"
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleDelete(act.id)}
          className="rounded p-1 text-red-600 hover:bg-red-50"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de Actividades</h1>
          <p className="text-sm text-slate-500">Planifica y registra eventos, cursos y otras actividades institucionales.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setAsistenciaModal(prev => ({ ...prev, open: true, selectedActividadId: '', inscritos: [] }))}
            className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-9 font-bold"
          >
            <ClipboardList className="h-4 w-4" />
            Reporte de Asistencia
          </Button>
          <ExportButtons 
            data={actividades.map(a => ({ Actividad: a.nombre, Tipo: a.tipo_nombre, Fecha: a.fecha, Hora: a.hora, Ubicacion: a.ubicacion, Modalidad: a.modalidad, Cupos: a.cupos }))} 
            filename="lista_actividades" 
            title="Cronograma de Actividades" 
          />
          <Button type="button" onClick={handleOpenCreate} className="h-9">
            <CalendarPlus className="h-4 w-4" />
            Nueva actividad
          </Button>
        </div>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Listado de actividades</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando actividades...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <>
              <Table columns={columns} rows={rows} emptyMessage="No hay actividades registradas." />
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                  <p className="text-xs text-slate-500">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, actividades.length)} de {actividades.length} actividades
                  </p>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      className="h-8 px-2 text-xs" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "outline"}
                        className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button 
                      variant="outline" 
                      className="h-8 px-2 text-xs" 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingAct ? 'Editar actividad' : 'Crear nueva actividad'}
        width="max-w-5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {/* Carga de Imagen */}
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 group hover:border-blue-300 transition-colors relative overflow-hidden min-h-[140px]">
                <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                  <div className="h-10 w-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">Subir imagen</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
              
              {/* Previsualización de Imagen */}
              {previewUrl && (
                <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg max-w-xs relative group animate-in fade-in duration-200">
                  <p className="text-xs text-slate-400 font-medium mb-1">Previsualización de Imagen:</p>
                  <div className="relative rounded overflow-hidden border border-slate-100">
                    <img 
                      src={previewUrl} 
                      alt="Vista previa de la actividad" 
                      className="max-h-45 w-auto object-cover rounded shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setImageModal({ open: true, url: previewUrl })}
                      title="Haga clic para ampliar"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Haga clic en la imagen para ampliar</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                      title="Eliminar imagen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              <Input 
                label="Nombre de la Actividad" 
                value={formData.nombre} 
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                required 
              />
              
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Tags className="h-3 w-3" /> Tipo de Actividad
                </label>
                <select
                  value={formData.tipo_actividad_id}
                  onChange={(e) => setFormData({ ...formData, tipo_actividad_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Fecha" 
                  type="date" 
                  value={formData.fecha} 
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} 
                  required 
                />
                <Input 
                  label="Hora" 
                  type="time" 
                  value={formData.hora} 
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Modalidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {['presencial', 'virtual'].map(mod => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setFormData({ ...formData, modalidad: mod })}
                      className={`py-2 px-4 rounded-xl text-xs font-black uppercase transition-all border ${
                        formData.modalidad === mod 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                          : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              <Input 
                label="Lugar / Enlace" 
                value={formData.ubicacion} 
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} 
                placeholder={formData.modalidad === 'virtual' ? 'Enlace de Zoom/Meet' : 'Dirección física'}
                required
              />

              {formData.modalidad === 'presencial' && (
                <MapPicker 
                  lat={formData.latitud} 
                  lng={formData.longitud} 
                  onChange={(lat, lng) => setFormData({ ...formData, latitud: lat, longitud: lng })} 
                  color="emerald"
                />
              )}

              <Input 
                label="Costo (Bs)" 
                type="number" 
                value={formData.costo} 
                onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })} 
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Input 
              label="Descripción" 
              type="textarea"
              value={formData.descripcion} 
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
              className="h-20"
            />
            <Input 
              label="Requisitos" 
              type="textarea"
              value={formData.requisitos} 
              onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })} 
              placeholder="Ej: Conocimientos previos en..."
              className="h-20"
            />
            
            <div className="grid grid-cols-2 gap-6 items-center">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`h-6 w-11 rounded-full p-1 transition-colors ${formData.incluye_certificacion ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${formData.incluye_certificacion ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={formData.incluye_certificacion} 
                  onChange={(e) => setFormData({ ...formData, incluye_certificacion: e.target.checked })} 
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-600">Incluye Certificación</span>
              </label>

              <Input 
                label="Cupos disponibles" 
                type="number" 
                value={formData.cupos} 
                onChange={(e) => setFormData({ ...formData, cupos: parseInt(e.target.value) || 0 })} 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              El estado se actualizará automáticamente según la fecha seleccionada.
            </span>
          </div>
          
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Actividad'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de inscritos a la actividad */}
      <Modal
        isOpen={inscritosModal.open}
        onClose={() => setInscritosModal(prev => ({ ...prev, open: false }))}
        title={`Inscritos: ${inscritosModal.actividad?.nombre || ''}`}
        width="max-w-4xl"
      >
        {inscritosModal.loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-500">
            <Spinner size="sm" /> Cargando inscritos...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lista de inscritos actual */}
            {inscritosModal.inscritos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No hay inscritos en esta actividad.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{inscritosModal.inscritos.length} inscrito(s)</p>
                {inscritosModal.inscritos.map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-slate-400 bg-slate-200/50 rounded-full h-6 w-6 flex items-center justify-center text-xs shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{u.nombre} {u.apellidoPaterno || ''} {u.apellidoMaterno || ''}</p>
                        <p className="text-xs text-slate-400 font-medium">{u.email} {u.telefono ? `| Tel: ${u.telefono}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${u.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600'}`}>{u.estado}</span>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">{u.fechaInscripcion ? new Date(u.fechaInscripcion).toLocaleDateString('es-ES') : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario de inscripción manual */}
            {inscritosModal.actividad && (() => {
              const enrolledIds = new Set(inscritosModal.inscritos.map(ins => ins.id));
              const availableMiembros = todosMiembros.filter(m => m.estado === 'activo' && !enrolledIds.has(m.id));
              
              return (
                <form onSubmit={handleManualInscribir} className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
                  <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> Inscribir Socio Manualmente
                  </h4>
                  <div className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Buscar socio por nombre o correo..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none pr-8"
                        value={memberSearchQuery}
                        onChange={(e) => {
                          setMemberSearchQuery(e.target.value);
                          setIsMemberDropdownOpen(true);
                          if (!e.target.value) {
                            setSelectedMiembroId('');
                          }
                        }}
                        onFocus={() => setIsMemberDropdownOpen(true)}
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>

                      {isMemberDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setIsMemberDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20">
                            {availableMiembros
                              .filter(m => {
                                const fullName = `${m.nombre} ${m.apellidoPaterno || ''} ${m.apellidoMaterno || ''}`.toLowerCase();
                                const email = (m.correoElectronico || '').toLowerCase();
                                const query = memberSearchQuery.toLowerCase();
                                return fullName.includes(query) || email.includes(query);
                              })
                              .slice(0, 10)
                              .map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex flex-col border-b border-slate-100/60 last:border-0"
                                  onClick={() => {
                                    setSelectedMiembroId(m.id);
                                    setMemberSearchQuery(`${m.nombre} ${m.apellidoPaterno || ''} (${m.correoElectronico})`);
                                    setIsMemberDropdownOpen(false);
                                  }}
                                >
                                  <span className="font-semibold text-slate-800">{m.nombre} {m.apellidoPaterno || ''} {m.apellidoMaterno || ''}</span>
                                  <span className="text-[10px] text-slate-500">{m.correoElectronico}</span>
                                </button>
                              ))}

                            {availableMiembros.filter(m => {
                              const fullName = `${m.nombre} ${m.apellidoPaterno || ''} ${m.apellidoMaterno || ''}`.toLowerCase();
                              const email = (m.correoElectronico || '').toLowerCase();
                              const query = memberSearchQuery.toLowerCase();
                              return fullName.includes(query) || email.includes(query);
                            }).length === 0 && (
                              <div className="px-3 py-3 text-xs text-slate-400 text-center">
                                No se encontraron socios disponibles
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      disabled={manualInscribiendo || !selectedMiembroId} 
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-4 py-2"
                    >
                      {manualInscribiendo ? 'Inscribiendo...' : 'Inscribir'}
                    </Button>
                  </div>
                </form>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Modal de detalle de actividad */}
      <Modal 
        isOpen={detalleModal.open} 
        onClose={() => setDetalleModal({ open: false, actividad: null })} 
        title="Detalle de la Actividad"
        width="max-w-4xl"
      >
        {detalleModal.actividad && (
          <div className="space-y-6 text-sm">
            {/* Cabecera / Imagen y Título */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {detalleModal.actividad.imagen ? (
                <img 
                  src={detalleModal.actividad.imagen} 
                  alt={detalleModal.actividad.nombre} 
                  className="w-full md:w-48 h-32 object-cover rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => setImageModal({ open: true, url: detalleModal.actividad.imagen })}
                  title="Haga clic para ampliar"
                />
              ) : (
                <div className="w-full md:w-48 h-32 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold uppercase shrink-0">
                  Sin Imagen
                </div>
              )}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wide">
                    {detalleModal.actividad.tipo_nombre}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                    detalleModal.actividad.modalidad === 'virtual' 
                      ? 'bg-purple-50 text-purple-700' 
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {detalleModal.actividad.modalidad}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                    detalleModal.actividad.estado === 'finalizado' 
                      ? 'bg-slate-100 text-slate-700' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {detalleModal.actividad.estado}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{detalleModal.actividad.nombre}</h3>
                <p className="text-slate-500">{detalleModal.actividad.descripcion || 'Sin descripción'}</p>
              </div>
            </div>

            {/* Datos Técnicos de la Actividad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Fecha y Hora</p>
                <p className="font-semibold text-slate-900">
                  {new Date(detalleModal.actividad.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} a las {detalleModal.actividad.hora?.substring(0, 5)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Costo / Inversión</p>
                <p className="font-bold text-emerald-700 text-base">
                  {detalleModal.actividad.costo > 0 ? `Bs. ${detalleModal.actividad.costo}` : 'Gratuito'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Ubicación / Lugar</p>
                <p className="font-semibold text-slate-900 flex items-center gap-1">
                  {detalleModal.actividad.modalidad === 'virtual' ? (
                    <a href={detalleModal.actividad.ubicacion} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">
                      {detalleModal.actividad.ubicacion}
                    </a>
                  ) : (
                    <span className="text-slate-900 break-words">{detalleModal.actividad.ubicacion}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Cupos Totales</p>
                <p className="font-semibold text-slate-900">
                  {detalleModal.actividad.cupos} cupos disponibles
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Certificación</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                  detalleModal.actividad.incluye_certificacion 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {detalleModal.actividad.incluye_certificacion ? '✓ Sí, incluye certificación' : '✗ No incluye certificación'}
                </span>
              </div>
              {detalleModal.actividad.requisitos && (
                <div className="col-span-1 md:col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Requisitos previos</p>
                  <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">{detalleModal.actividad.requisitos}</p>
                </div>
              )}
            </div>

            {/* Mapa de Ubicación si es Presencial */}
            {detalleModal.actividad.modalidad === 'presencial' && detalleModal.actividad.latitud && (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <p className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest p-3 border-b border-slate-200">Ubicación Georreferenciada</p>
                <div className="p-1">
                  <iframe
                    title="Ubicación de Actividad"
                    width="100%"
                    height="220"
                    frameBorder="0"
                    style={{ border: 0, borderRadius: '8px' }}
                    src={`https://maps.google.com/maps?q=${detalleModal.actividad.latitud},${detalleModal.actividad.longitud}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Configuración de Reporte de Asistencia */}
      <Modal
        isOpen={asistenciaModal.open}
        onClose={() => setAsistenciaModal(prev => ({ ...prev, open: false }))}
        title="Configuración de Reporte de Asistencia"
        width="max-w-5xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selector de Actividad y Selección de Columnas */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Seleccionar Actividad (Curso)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar actividad por nombre o tipo..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none pr-10"
                    value={actividadSearchQuery}
                    onChange={(e) => {
                      setActividadSearchQuery(e.target.value);
                      setIsActividadDropdownOpen(true);
                      if (!e.target.value) {
                        setAsistenciaModal(prev => ({ ...prev, selectedActividadId: '', inscritos: [] }));
                      }
                    }}
                    onFocus={() => setIsActividadDropdownOpen(true)}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {isActividadDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsActividadDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20">
                      {actividades
                        .filter(act => {
                          const name = act.nombre.toLowerCase();
                          const type = (act.tipo_nombre || '').toLowerCase();
                          const query = actividadSearchQuery.toLowerCase();
                          return name.includes(query) || type.includes(query);
                        })
                        .slice(0, 10)
                        .map((act) => (
                          <button
                            key={act.id}
                            type="button"
                            className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 flex flex-col border-b border-slate-100 last:border-0"
                            onClick={() => {
                              handleReportActividadChange(act.id);
                              setActividadSearchQuery(`${act.nombre} (${new Date(act.fecha).toLocaleDateString()})`);
                              setIsActividadDropdownOpen(false);
                            }}
                          >
                            <span className="font-semibold text-slate-800">{act.nombre}</span>
                            <span className="text-[10px] text-slate-500">Categoría: {act.tipo_nombre} | Fecha: {new Date(act.fecha).toLocaleDateString()}</span>
                          </button>
                        ))}

                      {actividades.filter(act => {
                        const name = act.nombre.toLowerCase();
                        const type = (act.tipo_nombre || '').toLowerCase();
                        const query = actividadSearchQuery.toLowerCase();
                        return name.includes(query) || type.includes(query);
                      }).length === 0 && (
                        <div className="px-3 py-3 text-xs text-slate-400 text-center">
                          No se encontraron actividades
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600" /> Atributos de Miembro a incluir
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-not-allowed p-1.5 rounded opacity-75">
                    <input type="checkbox" checked disabled className="rounded text-blue-600" />
                    <span>Nº (Secuencial)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-not-allowed p-1.5 rounded opacity-75">
                    <input type="checkbox" checked disabled className="rounded text-blue-600" />
                    <span>Nombre completo</span>
                  </label>
                  {Object.keys(asistenciaModal.columns).filter(k => k !== 'nro' && k !== 'nombre').map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                      <input 
                        type="checkbox" 
                        checked={asistenciaModal.columns[key]}
                        onChange={() => setAsistenciaModal(prev => ({
                          ...prev,
                          columns: { ...prev.columns, [key]: !prev.columns[key] }
                        }))}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        {key === 'email' ? 'Correo Electrónico' :
                         key === 'telefono' ? 'Teléfono' :
                         key === 'firma' ? 'Casilla de Firma' :
                         key === 'fecha' ? 'Fecha Inscripción' :
                         key === 'estado' ? 'Estado inscripción' : key}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Vista previa / Resumen de inscritos */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col h-full min-h-[220px]">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Previsualización de Reporte</h3>
              {asistenciaModal.loading ? (
                <div className="flex-1 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Spinner size="sm" /> Cargando inscripciones...
                </div>
              ) : !asistenciaModal.selectedActividadId ? (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-400 italic text-center">
                  Seleccione una actividad de la lista de la izquierda para ver los inscritos y habilitar la exportación.
                </div>
              ) : asistenciaModal.inscritos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-sm text-amber-600 text-center gap-2">
                  <Info className="h-8 w-8 text-amber-500" />
                  <span>No hay socios inscritos en esta actividad. Inscriba socios primero en la lista de actividades para poder generar el reporte de asistencia.</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Inscritos para esta actividad:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {asistenciaModal.inscritos.map((ins, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border border-slate-100 flex items-center gap-2">
                          <span className="font-bold text-slate-400">{idx + 1}.</span>
                          <span className="font-semibold text-slate-700">{ins.nombre} {ins.apellidoPaterno || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg text-emerald-800 border border-emerald-100 text-xs font-semibold mt-4">
                    ✓ Se generará una lista numerada con {asistenciaModal.inscritos.length} alumnos inscritos listos para tomar asistencia.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setAsistenciaModal(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button 
              onClick={() => executeAsistenciaExport('pdf')}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 font-bold px-4 py-2"
              disabled={asistenciaModal.inscritos.length === 0 || asistenciaModal.loading}
            >
              <FileType className="h-4 w-4" /> Exportar PDF (Firma)
            </Button>
            <Button 
              onClick={() => executeAsistenciaExport('excel')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 font-bold px-4 py-2"
              disabled={asistenciaModal.inscritos.length === 0 || asistenciaModal.loading}
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button 
              onClick={() => executeAsistenciaExport('txt')}
              className="bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-2 font-bold px-4 py-2"
              disabled={asistenciaModal.inscritos.length === 0 || asistenciaModal.loading}
            >
              <FileText className="h-4 w-4" /> Exportar TXT
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para ver imagen en grande */}
      <Modal 
        isOpen={imageModal.open} 
        onClose={() => setImageModal({ open: false, url: null })} 
        title="Vista previa de imagen"
      >
        <div className="flex justify-center bg-slate-900/5 rounded-xl p-2 overflow-hidden">
          {imageModal.url && (
            <img 
              src={imageModal.url} 
              alt="Vista previa" 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Operación Exitosa" : "Error en Operación"} 
        width="max-w-md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {resultModal.type === 'success' ? (
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          ) : (
            <div className="rounded-full bg-rose-100 p-3 text-rose-600">
              <AlertCircle className="h-12 w-12" />
            </div>
          )}
          <h4 className={`text-lg font-bold ${resultModal.type === 'success' ? 'text-slate-900' : 'text-rose-900'}`}>
            {resultModal.text}
          </h4>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {resultModal.details}
          </p>
          <div className="pt-2 w-full">
            <Button 
              className="w-full" 
              variant={resultModal.type === 'success' ? 'primary' : 'danger'}
              onClick={() => setResultModal(prev => ({ ...prev, open: false }))}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

