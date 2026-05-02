import { useState } from 'react';
import { CalendarCheck, CalendarPlus, Edit, Trash2, Camera, X, MapPin, Info, Users } from 'lucide-react';
import { useEventos } from '../hooks';
import { Button, Spinner, Modal, Input, ExportButtons } from '../../../components/ui';
import { MapPicker } from '../../../components/ui/MapPicker';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { academicoApi } from '../api';
import { administracionApi } from '../../administracion/api';
import { useAuthStore } from '../../../store/authStore';

export const GestionEventosPage = () => {
  const { eventos, loading, error, setEventos } = useEventos();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    descripcion: '', 
    fecha: '', 
    hora: '19:00',
    asistentes: 0, 
    ubicacion: '', 
    latitud: '',
    longitud: '',
    modalidad: 'presencial',
    costo: 0, 
    requisitos: '',
    incluye_certificacion: false,
    estado: 'programado' 
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [inscritosModal, setInscritosModal] = useState({ open: false, evento: null, inscritos: [], loading: false });

  const columns = [
    { key: 'imagen_display', label: 'Imagen' },
    { key: 'nombre', label: 'Evento' },
    { key: 'fecha_hora', label: 'Fecha/Hora' },
    { key: 'ubicacion_display', label: 'Ubicación' },
    { key: 'asistentes', label: 'Asistentes' },
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
    setEditingEvento(null);
    setFormData({ 
      nombre: '', 
      descripcion: '', 
      fecha: '', 
      hora: '19:00',
      asistentes: 0, 
      ubicacion: '', 
      latitud: '',
      longitud: '',
      modalidad: 'presencial',
      costo: 0, 
      requisitos: '',
      incluye_certificacion: false,
      estado: 'programado'
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evento) => {
    setEditingEvento(evento);
    setFormData({ 
      nombre: evento.nombre, 
      descripcion: evento.descripcion || '',
      fecha: evento.fecha, 
      hora: evento.hora ? evento.hora.substring(0, 5) : '19:00',
      asistentes: evento.cupos || evento.asistentes || 0,
      ubicacion: evento.ubicacion || '',
      latitud: evento.latitud || '',
      longitud: evento.longitud || '',
      modalidad: evento.modalidad || 'presencial',
      costo: evento.costo || 0,
      requisitos: evento.requisitos || '',
      incluye_certificacion: evento.incluye_certificacion || false,
      estado: evento.estado || 'programado'
    });
    setSelectedFile(null);
    setPreviewUrl(evento.imagen || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este evento?')) return;
    try {
      await academicoApi.eliminarEvento(id);
      setEventos(eventos.filter(e => e.id !== id));
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleVerInscritos = async (evento) => {
    setInscritosModal({ open: true, evento, inscritos: [], loading: true });
    try {
      const inscritos = await administracionApi.obtenerInscritosEvento(evento.id);
      setInscritosModal(prev => ({ ...prev, inscritos, loading: false }));
    } catch (err) {
      console.error('Error cargando inscritos:', err);
      setInscritosModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData, miembro_id: user?.id };
      if (editingEvento) {
        const actualizado = await academicoApi.actualizarEvento(editingEvento.id, payload, selectedFile);
        setEventos(eventos.map(e => e.id === editingEvento.id ? actualizado : e));
      } else {
        const nuevoEvento = await academicoApi.crearEvento(payload, selectedFile);
        setEventos([nuevoEvento, ...eventos]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error al procesar el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows = eventos.map((evento) => ({
    ...evento,
    fecha_hora: (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900">{new Date(evento.fecha).toLocaleDateString()}</span>
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{evento.hora?.substring(0, 5) || '--:--'}</span>
      </div>
    ),
    ubicacion_display: (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 truncate max-w-[150px]">{evento.ubicacion || 'Sin ubicación'}</span>
        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
          {evento.modalidad === 'virtual' ? <Info className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
          {evento.modalidad || 'presencial'}
        </span>
      </div>
    ),
    imagen_display: (
      <div className="h-10 w-16 rounded overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
        {evento.imagen ? (
          <img src={evento.imagen} alt={evento.nombre} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">Sin Foto</div>
        )}
      </div>
    ),
    acciones: (
      <div className="flex gap-2">
        <button 
          onClick={() => handleVerInscritos(evento)}
          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
          title="Ver inscritos"
        >
          <Users className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleOpenEdit(evento)}
          className="rounded p-1 text-blue-600 hover:bg-blue-50"
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleDelete(evento.id)}
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
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de eventos</h1>
          <p className="text-sm text-slate-500">Coordina la agenda academica institucional.</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons 
            data={eventos.map(e => ({ Evento: e.nombre, Fecha: e.fecha, Hora: e.hora, Ubicacion: e.ubicacion, Modalidad: e.modalidad, Asistentes: e.cupos || e.asistentes }))} 
            filename="lista_eventos" 
            title="Agenda de Eventos Institucionales" 
          />
          <Button type="button" onClick={handleOpenCreate}>
            <CalendarPlus className="h-4 w-4" />
            Nuevo evento
          </Button>
        </div>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Eventos programados</h2>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando eventos...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={rows} emptyMessage="No hay eventos registrados." />
          )}
        </div>
      </section>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEvento ? 'Editar evento' : 'Crear nuevo evento'}
        width="max-w-5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {/* Carga de Imagen */}
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 group hover:border-blue-300 transition-colors relative overflow-hidden min-h-[160px]">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="h-16 w-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-2">
                        <Camera className="h-8 w-8 text-blue-600" />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                        className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <div className="h-12 w-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Camera className="h-6 w-6 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">Subir imagen</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <Input 
                label="Nombre del Evento" 
                value={formData.nombre} 
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                required 
              />
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
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
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
                placeholder={formData.modalidad === 'virtual' ? 'Enlace de Zoom/Meet' : 'Dirección del evento'}
                required
              />

              {formData.modalidad === 'presencial' && (
                <MapPicker 
                  lat={formData.latitud} 
                  lng={formData.longitud} 
                  onChange={(lat, lng) => setFormData({ ...formData, latitud: lat, longitud: lng })} 
                  color="blue"
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
              placeholder="Ej: Traer laptop, ser socio activo..."
              className="h-20"
            />
            
            <div className="grid grid-cols-2 gap-6 items-center">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`h-6 w-11 rounded-full p-1 transition-colors ${formData.incluye_certificacion ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${formData.incluye_certificacion ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={formData.incluye_certificacion} 
                  onChange={(e) => setFormData({ ...formData, incluye_certificacion: e.target.checked })} 
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">Incluye Certificación</span>
              </label>

              <Input 
                label="Invitados estimados" 
                type="number" 
                value={formData.asistentes} 
                onChange={(e) => setFormData({ ...formData, asistentes: parseInt(e.target.value) || 0 })} 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
              El estado se actualizará automáticamente según la fecha seleccionada.
            </span>
          </div>
          
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Evento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de inscritos al evento */}
      <Modal
        isOpen={inscritosModal.open}
        onClose={() => setInscritosModal(prev => ({ ...prev, open: false }))}
        title={`Inscritos: ${inscritosModal.evento?.nombre || ''}`}
      >
        {inscritosModal.loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-500">
            <Spinner size="sm" /> Cargando inscritos...
          </div>
        ) : inscritosModal.inscritos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay inscritos en este evento.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <p className="text-xs text-slate-500 font-semibold">{inscritosModal.inscritos.length} inscrito(s)</p>
            {inscritosModal.inscritos.map((u, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{u.nombre} {u.apellidoPaterno || ''} {u.apellidoMaterno || ''}</p>
                  <p className="text-xs text-slate-500">{u.email} {u.telefono ? `| Tel: ${u.telefono}` : ''}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{u.estado}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{u.fechaInscripcion ? new Date(u.fechaInscripcion).toLocaleDateString('es-ES') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
