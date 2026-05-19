import { useState, useEffect } from 'react';
import { Users, Search, Plus, Save, X, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input, Modal, Select, Spinner } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { administracionApi } from '../../administracion/api';
import { academicoApi } from '../api';
import { supabase } from '../../../services/supabase';

export const AsignarJuradoPage = () => {
  const [actividades, setActividades] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [jurados, setJurados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    actividad_id: '',
    actividad_externa: '',
    miembro_id: '',
    descripcion: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [acts, miems, jurs] = await Promise.all([
        academicoApi.obtenerActividades(),
        administracionApi.obtenerMiembros(),
        supabase.from('jurado').select('*, actividad(titulo), miembro(nombre, apellidoPaterno, apellidoPaterno)')
      ]);
      setActividades(acts);
      setMiembros(miems.filter(m => m.estado === 'activo'));
      if (jurs.error) throw jurs.error;
      setJurados(jurs.data || []);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error al cargar datos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.actividad_id && !form.actividad_externa) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Datos incompletos',
        details: 'Debe seleccionar una actividad del sistema o ingresar el nombre de una actividad externa.'
      });
      return;
    }
    if (!form.miembro_id) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Datos incompletos',
        details: 'Debe seleccionar un miembro para asignar como jurado.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('jurado').insert([{
        actividad_id: form.actividad_id || null,
        actividad_externa: form.actividad_externa || null,
        miembro_id: form.miembro_id,
        descripcion: form.descripcion
      }]);
      if (error) {
        if (error.code === '23505') throw new Error('El miembro ya es jurado en esta actividad.');
        throw error;
      }
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Jurado asignado con éxito!',
        details: 'La asignación del jurado se ha registrado de manera correcta en el sistema. El miembro designado recibirá una notificación inmediata.'
      });
      setIsModalOpen(false);
      setForm({ actividad_id: '', actividad_externa: '', miembro_id: '', descripcion: '' });
      cargarDatos();
    } catch (error) {
      console.error(error);
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se pudo asignar el jurado',
        details: error.message || 'Error de conexión o base de datos. Verifique si ejecutó el script setup.sql en Supabase.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta asignación de jurado?')) return;
    try {
      const { error } = await supabase.from('jurado').delete().eq('id', id);
      if (error) throw error;
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Asignación eliminada!',
        details: 'El miembro ha sido retirado del jurado de la actividad con éxito.'
      });
      cargarDatos();
    } catch (error) {
      console.error(error);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al eliminar',
        details: 'No se pudo eliminar el registro de jurado de la base de datos.'
      });
    }
  };

  const filtrados = jurados.filter(j => 
    j.actividad?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.actividad_externa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.miembro?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {message && <Toast type={message.type} message={message.text} onClose={() => setMessage(null)} />}
      
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Asignar Jurado</h1>
          <p className="text-sm text-slate-500">Administra los jurados para las actividades.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Asignar Jurado
        </Button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por actividad o miembro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center flex justify-center"><Spinner /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay asignaciones registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3">Jurado</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {j.actividad?.titulo ? (
                        j.actividad.titulo
                      ) : j.actividad_externa ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                          {j.actividad_externa} (Externa)
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">General</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{j.miembro?.nombre} {j.miembro?.apellidoPaterno}</td>
                    <td className="px-4 py-3">{j.descripcion || <span className="text-slate-400 italic">Sin descripción</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="danger" onClick={() => handleEliminar(j.id)} className="h-7 px-2 text-xs">
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
 
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Asignar Jurado a Actividad">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Actividad del Sistema (Opcional - Dejar vacío para externa)"
            name="actividad_id"
            value={form.actividad_id}
            onChange={handleChange}
          >
            <option value="">-- Actividad Externa (Manual) --</option>
            {actividades.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}
          </Select>

          {!form.actividad_id && (
            <Input
              label={<span>Nombre de la Actividad Externa <span className="text-red-500">*</span></span>}
              name="actividad_externa"
              value={form.actividad_externa}
              onChange={handleChange}
              placeholder="Ej. Taller de Robótica Externo 2026, etc."
              required
            />
          )}
 
          <Select
            label={<span>Miembro (Jurado) <span className="text-red-500">*</span></span>}
            name="miembro_id"
            value={form.miembro_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccione un miembro...</option>
            {miembros.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellidoPaterno}</option>)}
          </Select>
 
          <Input
            label="Descripción o Rol (opcional)"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej. Presidente de mesa, evaluador principal..."
          />
 
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Asignación
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Asignación Exitosa" : "Error de Asignación"} 
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
