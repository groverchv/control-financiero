import { useState } from 'react';
import { PackagePlus, Search } from 'lucide-react';
import { useActivos } from '../hooks';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { patrimonioApi } from '../api';

export const GestionActivosPage = () => {
  const { activos, loading, error, setActivos } = useActivos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', categoria: '', valorActual: 0, fechaAdquisicion: '' });

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'valorActual', label: 'Valor actual' },
    { key: 'fechaAdquisicion', label: 'Fecha' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const nuevoActivo = await patrimonioApi.registrarActivo(formData);
      setActivos([nuevoActivo, ...activos]);
      setIsModalOpen(false);
      setFormData({ nombre: '', categoria: '', valorActual: 0, fechaAdquisicion: '' });
    } catch (err) {
      console.error(err);
      alert('Error al registrar el activo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de activos</h1>
          <p className="text-sm text-slate-500">Control del inventario institucional.</p>
        </div>
        <Button type="button" onClick={() => setIsModalOpen(true)}>
          <PackagePlus className="h-4 w-4" />
          Registrar activo
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input className="flex-1" placeholder="Buscar activo" />
          </div>
          <span className="text-sm text-slate-500">{activos.length} activos</span>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando activos...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={activos} emptyMessage="No hay activos registrados." />
          )}
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar nuevo activo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre del Activo" 
            value={formData.nombre} 
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
            required 
          />
          <Input 
            label="Categoría" 
            value={formData.categoria} 
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} 
            required 
          />
          <Input 
            label="Valor Actual ($)" 
            type="number"
            step="0.01" 
            value={formData.valorActual} 
            onChange={(e) => setFormData({ ...formData, valorActual: parseFloat(e.target.value) || 0 })} 
          />
          <Input 
            label="Fecha de Adquisición" 
            type="date" 
            value={formData.fechaAdquisicion} 
            onChange={(e) => setFormData({ ...formData, fechaAdquisicion: e.target.value })} 
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Activo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
