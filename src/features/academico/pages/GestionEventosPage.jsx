import { useState } from 'react';
import { CalendarCheck, CalendarPlus, Edit, Trash2 } from 'lucide-react';
import { useEventos } from '../hooks';
import { Button, Spinner, Modal, Input } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { academicoApi } from '../api';

export const GestionEventosPage = () => {
  const { eventos, loading, error, setEventos } = useEventos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', fecha: '', asistentes: 0 });

  const columns = [
    { key: 'nombre', label: 'Evento' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'asistentes', label: 'Asistentes' },
    { key: 'acciones', label: 'Acciones' },
  ];

  const handleOpenCreate = () => {
    setEditingEvento(null);
    setFormData({ nombre: '', fecha: '', asistentes: 0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evento) => {
    setEditingEvento(evento);
    setFormData({ 
      nombre: evento.nombre, 
      fecha: evento.fecha, 
      asistentes: evento.asistentes 
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingEvento) {
        // ACTUALIZAR
        const actualizado = await academicoApi.actualizarEvento(editingEvento.id, formData);
        setEventos(eventos.map(e => e.id === editingEvento.id ? actualizado : e));
      } else {
        // CREAR
        const nuevoEvento = await academicoApi.crearEvento(formData);
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
    acciones: (
      <div className="flex gap-2">
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
        <Button type="button" onClick={handleOpenCreate}>
          <CalendarPlus className="h-4 w-4" />
          Nuevo evento
        </Button>
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
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre del Evento" 
            value={formData.nombre} 
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
            required 
          />
          <Input 
            label="Fecha" 
            type="date" 
            value={formData.fecha} 
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} 
            required 
          />
          <Input 
            label="Asistentes (Estimados)" 
            type="number" 
            value={formData.asistentes} 
            onChange={(e) => setFormData({ ...formData, asistentes: parseInt(e.target.value) || 0 })} 
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingEvento ? 'Actualizar' : 'Guardar Evento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
