import { useState, useEffect } from 'react';
import { PackagePlus, Search, Tags } from 'lucide-react';
import { useActivos } from '../hooks';
import { Button, Input, Spinner, Modal, Select, ExportButtons } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { patrimonioApi } from '../api';
import { useAuthStore } from '../../../store/authStore';
import { cloudinaryService } from '../../../services/cloudinary';

export const GestionActivosPage = () => {
  const { activos, loading, error, setActivos } = useActivos();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    tipo_activo_id: '',
    descripcion: '',
    costo_total: 0,
    fechaAdquisicion: '',
    imagen: null
  });
  const [tiposActivo, setTiposActivo] = useState([]);

  useEffect(() => {
    const loadTipos = async () => {
      try {
        const data = await patrimonioApi.obtenerTiposActivo();
        setTiposActivo(data);
      } catch (err) {
        console.error('Error al cargar tipos de activo:', err);
      }
    };
    loadTipos();
  }, []);

  const columns = [
    { 
      key: 'imagen_url', 
      label: 'Imagen',
      render: (val) => val ? (
        <img src={val} alt="Activo" className="h-10 w-10 rounded-md object-cover border border-slate-200" />
      ) : (
        <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Sin foto</div>
      )
    },
    { key: 'nombre', label: 'Nombre' },
    { 
      key: 'tipo_activo', 
      label: 'Tipo',
      render: (val) => val?.nombre || 'Sin tipo'
    },
    { 
      key: 'costo_total', 
      label: 'Costo Total',
      render: (val) => <span className="font-medium text-slate-900">{new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val || 0)}</span>
    },
    { 
      key: 'saldo_pendiente', 
      label: 'Saldo Pendiente',
      render: (val) => <span className={`font-medium ${val > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val || 0)}</span>
    },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (val) => (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          val === 'pagado' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
        }`}>
          {val === 'pagado' ? 'Pagado' : 'Deuda'}
        </span>
      )
    },
    { key: 'fechaAdquisicion', label: 'Fecha' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imagen_url = null;
      if (formData.imagen) {
        imagen_url = await cloudinaryService.uploadFile(formData.imagen, 'activos');
      }

      const payload = {
        miembro_id: user?.id,
        tipo_activo_id: formData.tipo_activo_id || null,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        costo_total: formData.costo_total,
        saldo_pendiente: formData.costo_total, // Al inicio el saldo es igual al costo
        fechaAdquisicion: formData.fechaAdquisicion,
        imagen_url,
        estado: 'deuda'
      };

      const nuevoActivo = await patrimonioApi.registrarActivo(payload);
      setActivos([nuevoActivo, ...activos]);
      setIsModalOpen(false);
      setFormData({ 
        nombre: '', 
        tipo_activo_id: '',
        descripcion: '',
        costo_total: 0,
        fechaAdquisicion: '',
        imagen: null 
      });
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
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de Activos</h1>
          <p className="text-sm text-slate-500">Control del inventario institucional.</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons 
            data={activos.map(a => ({ Activo: a.nombre, Tipo: a.tipo_activo?.nombre, Costo: a.costo_total, Estado: a.estado, Fecha: a.fechaAdquisicion }))} 
            filename="lista_activos" 
            title="Inventario de Activos Institucionales" 
          />
          <Button type="button" onClick={() => setIsModalOpen(true)}>
            <PackagePlus className="h-4 w-4" />
            Registrar activo
          </Button>
        </div>
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
          <Select
            label="Tipo de Activo"
            value={formData.tipo_activo_id}
            onChange={(e) => setFormData({ ...formData, tipo_activo_id: e.target.value })}
            required
          >
            <option value="">Seleccione un tipo...</option>
            {tiposActivo.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </Select>
          <Input 
            label="Descripción (Opcional)" 
            value={formData.descripcion} 
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
            placeholder="Detalles del activo..."
          />
          <Input 
            label="Costo Total ($)" 
            type="number"
            step="0.01" 
            value={formData.costo_total} 
            onChange={(e) => setFormData({ ...formData, costo_total: parseFloat(e.target.value) || 0 })} 
            required
          />
          <Input 
            label="Fecha de Adquisición" 
            type="date" 
            value={formData.fechaAdquisicion} 
            onChange={(e) => setFormData({ ...formData, fechaAdquisicion: e.target.value })} 
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Imagen del Activo</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, imagen: e.target.files[0] })}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
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
