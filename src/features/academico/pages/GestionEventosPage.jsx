import { useState } from 'react';
import { CalendarCheck, CalendarPlus } from 'lucide-react';
import { useEventos } from '../hooks';
import { Button, Spinner, Modal, Input } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { academicoApi } from '../api';

export const GestionEventosPage = () => {
  const { eventos, loading, error, setEventos } = useEventos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', fecha: '', asistentes: 0 });

  const columns = [
    { key: 'nombre', label: 'Evento' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'asistentes', label: 'Asistentes' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const nuevoEvento = await academicoApi.crearEvento(formData);
      setEventos([nuevoEvento, ...eventos]);
      setIsModalOpen(false);
      setFormData({ nombre: '', fecha: '', asistentes: 0 });
    } catch (err) {
      console.error(err);
      alert('Error al crear el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de eventos</h1>
          <p className="text-sm text-slate-500">Coordina la agenda academica institucional.</p>
        </div>
        <Button type="button" onClick={() => setIsModalOpen(true)}>
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
            <Table columns={columns} rows={eventos} emptyMessage="No hay eventos registrados." />
          )}
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear nuevo evento">
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
              {isSubmitting ? 'Guardando...' : 'Guardar Evento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
