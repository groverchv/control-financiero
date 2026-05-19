import { useState, useEffect } from 'react';
import { Tags, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await patrimonioApi.crearTipoActivo(formData);
      await fetchTipos();
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Categoría de activo registrada!',
        details: `La nueva categoría patrimonial "${formData.nombre}" ha sido dada de alta con éxito en el sistema.`
      });
      setIsModalOpen(false);
      setFormData({ nombre: '', descripcion: '' });
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al registrar categoría',
        details: err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql.'
      });
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

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Registro Exitoso" : "Error de Operación"} 
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
