import { useState, useEffect } from 'react';
import { Tags, Plus } from 'lucide-react';
import { patrimonioApi } from '../api';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';

export const GestionTiposActivoPage = () => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

  const fetchTipos = async () => {
    try {
      setLoading(true);
      const data = await patrimonioApi.obtenerTiposActivo();
      setTipos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tipos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await patrimonioApi.crearTipoActivo(formData);
      await fetchTipos();
      setIsModalOpen(false);
      setFormData({ nombre: '', descripcion: '' });
    } catch (err) {
      console.error(err);
      alert('Error al registrar el tipo de activo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'creacion', label: 'Fecha Creación', render: (val) => new Date(val).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tipos de Activos</h1>
          <p className="text-sm text-slate-500">Administra las categorias maestras de los activos.</p>
        </div>
        <Button type="button" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Tipo
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Tags className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Listado de Tipos</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size="sm" />
            Cargando tipos...
          </div>
        ) : error ? (
          <Toast title="Error" message={error} variant="error" />
        ) : (
          <Table columns={columns} rows={tipos} emptyMessage="No hay tipos de activos registrados." />
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Tipo de Activo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre del Tipo" 
            value={formData.nombre} 
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
            required 
            placeholder="Ej: Vehículos, Mobiliario..."
          />
          <Input 
            label="Descripción (Opcional)" 
            value={formData.descripcion} 
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
            placeholder="Breve detalle del tipo de activo"
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Tipo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
