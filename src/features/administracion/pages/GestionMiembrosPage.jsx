import { useState } from 'react';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useMiembros } from '../hooks';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { administracionApi } from '../api';

export const GestionMiembrosPage = () => {
  const { miembros, loading, error, setMiembros } = useMiembros();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', password: '', rol: 'socio', estado: 'activo' });

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'rol', label: 'Rol' },
    { key: 'estado', label: 'Estado' },
    { key: 'acciones', label: 'Acciones' },
  ];

  const handleOpenCreate = () => {
    setEditingMember(null);
    setFormData({ nombre: '', email: '', telefono: '', password: '', rol: 'socio', estado: 'activo' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (miembro) => {
    setEditingMember(miembro);
    setFormData({
      nombre: miembro.nombre,
      email: miembro.email,
      telefono: miembro.telefono || '',
      password: '', // No mostramos la contraseña actual por seguridad
      rol: miembro.rol,
      estado: miembro.estado
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este miembro? Se borrará también su cuenta de acceso.')) return;
    
    try {
      await administracionApi.eliminarMiembro(id);
      setMiembros(miembros.filter(m => m.id !== id));
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingMember) {
        // ACTUALIZAR
        const { password, email, ...updates } = formData; // No permitimos cambiar email fácilmente aquí por consistencia con Auth
        const actualizado = await administracionApi.actualizarMiembro(editingMember.id, updates);
        setMiembros(miembros.map(m => m.id === editingMember.id ? actualizado : m));
      } else {
        // CREAR
        const nuevoMiembro = await administracionApi.crearMiembro(formData);
        if (nuevoMiembro) {
          setMiembros([nuevoMiembro, ...miembros]);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows = miembros.map((miembro) => ({
    ...miembro,
    estado: (
      <span className={`rounded-full px-2 py-1 text-xs ${
        miembro.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {miembro.estado}
      </span>
    ),
    acciones: (
      <div className="flex gap-2">
        <button 
          onClick={() => handleOpenEdit(miembro)}
          className="rounded p-1 text-blue-600 hover:bg-blue-50"
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleDelete(miembro.id)}
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
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de miembros</h1>
          <p className="text-sm text-slate-500">Administra el registro institucional de socios.</p>
        </div>
        <Button type="button" onClick={handleOpenCreate}>
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMember ? 'Editar miembro' : 'Registrar nuevo miembro'}
      >
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
            disabled={!!editingMember}
          />
          
          {!editingMember && (
            <Input 
              label="Contraseña" 
              type="password"
              value={formData.password} 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              required 
            />
          )}

          <Input 
            label="Teléfono" 
            value={formData.telefono} 
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Rol</label>
              <select
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              >
                <option value="socio">Socio</option>
                <option value="secretario">Secretario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Estado</label>
              <select
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingMember ? 'Actualizar' : 'Guardar Miembro'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
