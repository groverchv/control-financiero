import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useMiembros } from '../hooks';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { administracionApi } from '../api';

export const GestionMiembrosPage = () => {
  const { miembros, loading, error, setMiembros } = useMiembros();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', password: '', rol: 'socio' });

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'telefono', label: 'Telefono' },
    { key: 'estado', label: 'Estado' },
  ];
  const rows = miembros.map((miembro) => ({
    ...miembro,
    estado: (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
        {miembro.estado}
      </span>
    ),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const nuevoMiembro = await administracionApi.crearMiembro(formData);
      if (nuevoMiembro) {
        setMiembros([nuevoMiembro, ...miembros]);
      }
      setIsModalOpen(false);
      setFormData({ nombre: '', email: '', telefono: '', password: '', rol: 'socio' });
    } catch (err) {
      console.error(err);
      alert('Error al registrar el miembro: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de miembros</h1>
          <p className="text-sm text-slate-500">Administra el registro institucional de socios.</p>
        </div>
        <Button type="button" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo miembro
        </Button>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o correo"
              className="flex-1"
            />
          </div>
          <span className="text-sm text-slate-500">{miembros.length} registros</span>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando miembros...
            </div>
          ) : error ? (
            <Toast title="Error" message={error} variant="error" />
          ) : (
            <Table columns={columns} rows={rows} emptyMessage="No hay miembros registrados." />
          )}
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar nuevo miembro">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre Completo" 
            value={formData.nombre} 
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
            required 
          />
          <Input 
            label="Correo Electrónico" 
            type="email"
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
            required 
          />
          <Input 
            label="Contraseña" 
            type="password"
            value={formData.password} 
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
            required 
          />
          <Input 
            label="Teléfono" 
            value={formData.telefono} 
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Rol</label>
            <select
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.rol}
              onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
            >
              <option value="socio">Socio</option>
              <option value="secretario">Secretario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Miembro'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
