import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input, Modal, Select, Spinner } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { administracionApi } from '../../administracion/api';
import { academicoApi } from '../api';
import { supabase } from '../../../services/supabase';

export const AsignarJuradoPage = () => {
  const [actividades, setActividades] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [jurados, setJurados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    es_externa: 'false', // 'false' (Sistema) | 'true' (Externa)
    tipo_actividad_id: '',
    actividad_id: '',
    actividad_externa: '',
    es_jurado_externo: 'false', // 'false' (Socio) | 'true' (Externo)
    miembro_id: '',
    nombre_jurado_externo: '',
    descripcion: ''
  });
  const [selectedMiembroIds, setSelectedMiembroIds] = useState([]);
  const [searchMiembroQuery, setSearchMiembroQuery] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');

  const isSubmitDisabled = 
    (form.es_jurado_externo === 'true' ? !form.nombre_jurado_externo.trim() : selectedMiembroIds.length === 0) || 
    (form.es_externa === 'true' ? !form.actividad_externa.trim() : !form.actividad_id);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [acts, miems, jurs, tipos] = await Promise.all([
        academicoApi.obtenerActividades(),
        administracionApi.obtenerMiembros(),
        supabase.from('jurado').select('*, miembro(id, nombre, "apellidoPaterno", "apellidoMaterno"), actividad(id, titulo, fecha, hora, blockchain_tx_id)'),
        academicoApi.obtenerTiposActividad()
      ]);
      
      // Filtrar actividades: mostrar todas las actividades que no estén finalizadas o canceladas
      const actsFiltradas = acts.filter(a => a.estado !== 'finalizado' && a.estado !== 'cancelado');
      
      setActividades(actsFiltradas);
      setTiposActividad(tipos || []);
      setMiembros(miems.filter(m => m.estado === 'activo'));
      if (jurs.error) throw jurs.error;
      setJurados(jurs.data || []);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error al cargar datos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await cargarDatos();
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [cargarDatos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Limpiar filtros dependientes si cambian toggles
      if (name === 'es_externa') {
        updated.actividad_id = '';
        updated.tipo_actividad_id = '';
        updated.actividad_externa = '';
      }
      if (name === 'es_jurado_externo') {
        updated.miembro_id = '';
        updated.nombre_jurado_externo = '';
        setSelectedMiembroIds([]);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const esActividadExterna = form.es_externa === 'true';
    const esJuezExterno = form.es_jurado_externo === 'true';

    if (!esActividadExterna && !form.actividad_id) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Datos incompletos',
        details: 'Debe seleccionar una actividad disponible del sistema.'
      });
      return;
    }
    if (esActividadExterna && !form.actividad_externa.trim()) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Datos incompletos',
        details: 'Debe ingresar el nombre de la actividad externa.'
      });
      return;
    }
    if (!esJuezExterno && selectedMiembroIds.length === 0) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Datos incompletos',
        details: 'Debe seleccionar al menos un socio miembro del sistema para asignarlo.'
      });
      return;
    }
    if (esJuezExterno && !form.nombre_jurado_externo.trim()) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Datos incompletos',
        details: 'Debe ingresar el nombre del jurado externo.'
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!esJuezExterno) {
        // Registrar múltiples jurados socios simultáneamente
        await Promise.all(selectedMiembroIds.map(mId => 
          academicoApi.asignarJurado({
            actividad_id: esActividadExterna ? null : form.actividad_id,
            actividad_externa: esActividadExterna ? form.actividad_externa.trim() : null,
            miembro_id: mId,
            descripcion: form.descripcion
          })
        ));
      } else {
        // Registrar jurado externo
        const finalDescripcion = `[JURADO EXTERNO: ${form.nombre_jurado_externo.trim()}] ${form.descripcion}`.trim();
        await academicoApi.asignarJurado({
          actividad_id: esActividadExterna ? null : form.actividad_id,
          actividad_externa: esActividadExterna ? form.actividad_externa.trim() : null,
          miembro_id: null,
          descripcion: finalDescripcion
        });
      }
      
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Asignación guardada con éxito!',
        details: esJuezExterno 
          ? 'El jurado externo ha sido asignado de manera correcta a la actividad.'
          : 'Los socios seleccionados han sido asignados como jurados exitosamente.'
      });
      setIsModalOpen(false);
      setForm({
        es_externa: 'false',
        tipo_actividad_id: '',
        actividad_id: '',
        actividad_externa: '',
        es_jurado_externo: 'false',
        miembro_id: '',
        nombre_jurado_externo: '',
        descripcion: ''
      });
      setSelectedMiembroIds([]);
      setSearchMiembroQuery('');
      cargarDatos();
    } catch (error) {
      console.error(error);
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se pudo asignar el jurado',
        details: error.message || 'Error de conexión o base de datos. Verifique si alguno de los socios ya fue asignado previamente.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta asignación de jurado?')) return;
    try {
      await academicoApi.eliminarJurado(id);
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Asignación eliminada!',
        details: 'El jurado ha sido retirado de la actividad con éxito.'
      });
      cargarDatos();
    } catch (error) {
      console.error(error);
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al eliminar',
        details: error.message || 'No se pudo eliminar el registro de jurado de la base de datos.'
      });
    }
  };

  const filtrados = jurados.filter(j => {
    const extName = j.descripcion?.match(/\[JURADO EXTERNO:\s*(.*?)\]/)?.[1] || '';
    const actName = j.actividad?.titulo || j.actividad_externa || '';
    const jName = j.miembro ? `${j.miembro.nombre} ${j.miembro.apellidoPaterno || ''}` : extName;
    return actName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           jName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const actividadesDisponiblesFiltradas = useMemo(() => {
    if (!form.tipo_actividad_id) return actividades;
    return actividades.filter(a => {
      const actTypeId = a.tipo_actividad_id || a.tipo_actividad?.id;
      return String(actTypeId) === String(form.tipo_actividad_id);
    });
  }, [actividades, form.tipo_actividad_id]);

  const miembrosFiltradosModal = useMemo(() => {
    if (!searchMiembroQuery.trim()) return miembros;
    return miembros.filter(m => 
      `${m.nombre} ${m.apellidoPaterno || ''} ${m.apellidoMaterno || ''}`.toLowerCase().includes(searchMiembroQuery.toLowerCase())
    );
  }, [miembros, searchMiembroQuery]);

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
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
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
                    <td className="px-4 py-3">
                      {j.miembro ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{j.miembro.nombre} {j.miembro.apellidoPaterno || ''}</span>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-600 border border-blue-100">Socio</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {j.descripcion?.match(/\[JURADO EXTERNO:\s*(.*?)\]/)?.[1] || 'Jurado Externo'}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-600 border border-amber-200">Invitado</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {j.miembro ? (
                        j.descripcion || <span className="text-slate-400 italic">Sin descripción</span>
                      ) : (
                        j.descripcion?.replace(/\[JURADO EXTERNO:\s*(.*?)\]/, '').trim() || <span className="text-slate-400 italic">Jurado de evaluación externo</span>
                      )}
                    </td>
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
 
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Asignar Jurado a Actividad" width="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <Select
              label="Origen de la Actividad"
              name="es_externa"
              value={form.es_externa}
              onChange={handleChange}
            >
              <option value="false">Actividad del Sistema (Interna)</option>
              <option value="true">Actividad Externa (Manual)</option>
            </Select>

            {form.es_externa === 'false' ? (
              <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in duration-200">
                <Select
                  label="Filtrar por Tipo de Actividad"
                  name="tipo_actividad_id"
                  value={form.tipo_actividad_id}
                  onChange={handleChange}
                >
                  <option value="">Todos los tipos...</option>
                  {tiposActividad.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </Select>

                <Select
                  label={<span>Actividad Disponible <span className="text-red-500">*</span></span>}
                  name="actividad_id"
                  value={form.actividad_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccione una actividad...</option>
                  {actividadesDisponiblesFiltradas.map(a => (
                    <option key={a.id} value={a.id}>{a.titulo} ({a.tipo_nombre})</option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                <Input
                  label={<span>Nombre de la Actividad Externa <span className="text-red-500">*</span></span>}
                  name="actividad_externa"
                  value={form.actividad_externa}
                  onChange={handleChange}
                  placeholder="Ej. Taller de Robótica Externo 2026, etc."
                  required
                />
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <Select
              label="Tipo de Jurado"
              name="es_jurado_externo"
              value={form.es_jurado_externo}
              onChange={handleChange}
            >
              <option value="false">Miembro Socio (De la institución)</option>
              <option value="true">Jurado Externo (Invitado especial)</option>
            </Select>

            {form.es_jurado_externo === 'false' ? (
              <div className="animate-in fade-in duration-200 space-y-2">
                <label className="text-sm font-semibold text-slate-700">Seleccionar Socios (Jurados) <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Buscar socio por nombre..."
                  value={searchMiembroQuery}
                  onChange={(e) => setSearchMiembroQuery(e.target.value)}
                  className="h-9 text-xs mb-1"
                />
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-white shadow-inner">
                  {miembrosFiltradosModal.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No se encontraron socios activos.</p>
                  ) : (
                    miembrosFiltradosModal.map(m => {
                      const isChecked = selectedMiembroIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer transition-colors text-sm">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedMiembroIds(prev => 
                                isChecked ? prev.filter(id => id !== m.id) : [...prev, m.id]
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-800">{m.nombre} {m.apellidoPaterno || ''}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                  {selectedMiembroIds.length} socio(s) seleccionado(s)
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                <Input
                  label={<span>Nombre Completo del Jurado Externo <span className="text-red-500">*</span></span>}
                  name="nombre_jurado_externo"
                  value={form.nombre_jurado_externo}
                  onChange={handleChange}
                  placeholder="Ej. Ing. Carlos Gómez Arrien"
                  required
                />
              </div>
            )}
          </div>
 
          <Input
            label="Descripción o Rol en la Actividad (Opcional)"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej. Presidente de mesa, evaluador principal, jurado de honor..."
          />
 
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button 
              type="submit" 
              disabled={submitting || isSubmitDisabled}
              className={isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""}
            >
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
