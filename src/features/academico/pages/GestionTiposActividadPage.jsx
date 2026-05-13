import { useState } from 'react';
import { Tags, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useTiposActividad } from '../hooks';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { Table } from '../../../components/data-display';
import { academicoApi } from '../api';

export const GestionTiposActividadPage = () => {
  const { tipos, loading, error, setTipos } = useTiposActividad();
  const [message, setMessage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingTipo(null);
    setFormData({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (tipo) => {
    setEditingTipo(tipo);
    setFormData({ nombre: tipo.nombre, descripcion: tipo.descripcion || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (editingTipo) {
        const actualizado = await academicoApi.actualizarTipoActividad(editingTipo.id, formData);
        setTipos(tipos.map(t => t.id === editingTipo.id ? actualizado : t));
        setMessage({ type: 'success', text: 'Tipo de actividad actualizado correctamente.' });
      } else {
        const nuevo = await academicoApi.crearTipoActividad(formData);
        setTipos([nuevo, ...tipos]);
        setMessage({ type: 'success', text: 'Tipo de actividad creado correctamente.' });
      }
      setIsModalOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al procesar el tipo de actividad.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este tipo de actividad? Si hay actividades vinculadas, la operación podría fallar.')) return;
    try {
      await academicoApi.eliminarTipoActividad(id);
      setTipos(tipos.filter(t => t.id !== id));
      setMessage({ type: 'success', text: 'Tipo de actividad eliminado.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'No se pudo eliminar el tipo de actividad.' });
    }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'acciones', label: 'Acciones' }
  ];

  const rows = tipos.map(tipo => ({
    ...tipo,
    acciones: (
      <div className="flex gap-2">
        <button onClick={() => openEditModal(tipo)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
          <Edit className="h-4 w-4" />
        </button>
        <button onClick={() => handleDelete(tipo.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tipos de Actividades</h1>
          <p className="text-sm text-slate-500">Define las categorías (Seminarios, Talleres, Eventos Sociales, etc.)</p>
        </div>
        <Button onClick={openCreateModal}>
          <PlusCircle className="h-4 w-4" />
          Nuevo Tipo
        </Button>
      </header>

      {message && (
        <Toast
          title={message.type === 'error' ? 'Error' : 'Éxito'}
          message={message.text}
          variant={message.type === 'error' ? 'error' : 'success'}
        />
      )}

      <section className="rounded-md bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
            <Spinner size="sm" />
            Cargando tipos...
          </div>
        ) : error ? (
          <Toast title="Error" message={error} variant="error" />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            emptyMessage="No hay tipos de actividad registrados."
          />
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTipo ? 'Editar tipo de actividad' : 'Nuevo tipo de actividad'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            label="Nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
            placeholder="Ej: Taller, Seminario, Evento Social"
          />
          <Input
            label="Descripción (opcional)"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Breve descripción de la categoría"
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
