import { useState, useEffect } from 'react';
import { Tags, PlusCircle } from 'lucide-react';
import { finanzasApi } from '../api';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { Table } from '../../../components/data-display';

export const GestionTiposFinanzasPage = () => {
  const [tiposIngreso, setTiposIngreso] = useState([]);
  const [tiposEgreso, setTiposEgreso] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('ingreso'); // 'ingreso' or 'egreso'
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const [ingresos, egresos] = await Promise.all([
        finanzasApi.obtenerTiposIngreso(),
        finanzasApi.obtenerTiposEgreso(),
      ]);
      setTiposIngreso(ingresos);
      setTiposEgreso(egresos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const openModal = (type) => {
    setModalType(type);
    setFormData({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (modalType === 'ingreso') {
        const nuevo = await finanzasApi.crearTipoIngreso(formData.nombre, formData.descripcion);
        setTiposIngreso([nuevo, ...tiposIngreso]);
      } else {
        const nuevo = await finanzasApi.crearTipoEgreso(formData.nombre, formData.descripcion);
        setTiposEgreso([nuevo, ...tiposEgreso]);
      }
      setMessage({ type: 'success', text: `Tipo de ${modalType} creado correctamente.` });
      setIsModalOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: `Error al crear tipo de ${modalType}.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columnasIngreso = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
  ];

  const columnasEgreso = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Tipos de Ingreso y Egreso</h1>
        <p className="text-sm text-slate-500">Gestiona las categorías utilizadas para las finanzas.</p>
      </header>

      {message && (
        <Toast
          title={message.type === 'error' ? 'Error' : 'Éxito'}
          message={message.text}
          variant={message.type === 'error' ? 'error' : 'success'}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner size="sm" />
          Cargando categorías...
        </div>
      ) : error ? (
        <Toast title="Error" message={error} variant="error" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tipos de Ingreso */}
          <section className="rounded-md bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Tipos de Ingreso</h2>
              </div>
              <Button type="button" size="sm" onClick={() => openModal('ingreso')}>
                <PlusCircle className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            <Table
              columns={columnasIngreso}
              rows={tiposIngreso}
              emptyMessage="No hay tipos de ingreso registrados."
            />
          </section>

          {/* Tipos de Egreso */}
          <section className="rounded-md bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-rose-600" />
                <h2 className="text-lg font-semibold text-slate-900">Tipos de Egreso</h2>
              </div>
              <Button type="button" size="sm" onClick={() => openModal('egreso')}>
                <PlusCircle className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            <Table
              columns={columnasEgreso}
              rows={tiposEgreso}
              emptyMessage="No hay tipos de egreso registrados."
            />
          </section>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Registrar nuevo tipo de ${modalType}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            id="nombre"
            name="nombre"
            label="Nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
            autoFocus
          />
          <Input
            id="descripcion"
            name="descripcion"
            label="Descripción (opcional)"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />

          <div className="mt-6 flex justify-end gap-3">
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
