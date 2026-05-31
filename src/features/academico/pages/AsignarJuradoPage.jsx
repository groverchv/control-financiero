import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Save, CheckCircle2, AlertCircle, Edit, Trash2, Eye, Shield, ShieldCheck, Info } from 'lucide-react';
import { Button, Input, Modal, Select, Spinner } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
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
  const [detalleModal, setDetalleModal] = useState({ open: false, group: null });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "",
    actionType: "primary",
    onConfirm: null,
  });
  const [loadingModal, setLoadingModal] = useState({ open: false, text: "" });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const [form, setForm] = useState({
    es_externa: 'false', // 'false' (Sistema) | 'true' (Externa)
    tipo_actividad_id: '',
    actividad_id: '',
    actividad_externa: '',
    descripcion: ''
  });
  
  const [selectedMiembroIds, setSelectedMiembroIds] = useState([]);
  const [searchMiembroQuery, setSearchMiembroQuery] = useState('');
  const [externalJurados, setExternalJurados] = useState([]); // array of { id, nombre }
  
  const [searchTerm, setSearchTerm] = useState('');

  const isSubmitDisabled = 
    (form.es_externa === 'true' ? !form.actividad_externa.trim() : !form.actividad_id) ||
    (!isEditing && selectedMiembroIds.length === 0 && externalJurados.filter(j => j.nombre.trim()).length === 0);

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
      return updated;
    });
  };

  const addExternalJurado = () => {
    setExternalJurados(prev => [...prev, { id: Date.now() + Math.random(), nombre: '', isEditing: true }]);
  };

  const removeExternalJurado = (id) => {
    setExternalJurados(prev => prev.filter(item => item.id !== id));
  };

  const handleExternalNameChange = (id, newName) => {
    setExternalJurados(prev => prev.map(item => item.id === id ? { ...item, nombre: newName } : item));
  };

  const handleToggleEditExternal = (id, isEditingVal) => {
    setExternalJurados(prev => prev.map(item => item.id === id ? { ...item, isEditing: isEditingVal } : item));
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingGroup(null);
    setForm({
      es_externa: 'false',
      tipo_actividad_id: '',
      actividad_id: '',
      actividad_externa: '',
      descripcion: ''
    });
    setSelectedMiembroIds([]);
    setExternalJurados([]);
    setSearchMiembroQuery('');
    setIsModalOpen(true);
  };

  const handleVerDetalle = (group) => {
    setDetalleModal({ open: true, group });
  };

  const handleModificar = (group) => {
    setIsEditing(true);
    setEditingGroup(group);

    // Mapear campos del formulario
    setForm({
      es_externa: group.actividad_id ? 'false' : 'true',
      tipo_actividad_id: group.actividad?.tipo_actividad_id || '',
      actividad_id: group.actividad_id || '',
      actividad_externa: group.actividad_externa || '',
      descripcion: group.descripcionActividad || ''
    });

    // Cargar socios asignados
    setSelectedMiembroIds(group.juradosList.filter(j => !j.isExterno).map(j => j.miembro_id));

    // Cargar jurados externos asignados con isEditing: false por defecto
    setExternalJurados(group.juradosList.filter(j => j.isExterno).map((j, idx) => ({
      id: Date.now() + idx,
      nombre: j.nombre,
      isEditing: false
    })));

    setSearchMiembroQuery('');
    setIsModalOpen(true);
  };

  const handleEliminarGrupo = (group) => {
    const actLabel = group.actividad?.titulo || group.actividad_externa || 'la actividad';
    
    setConfirmModal({
      open: true,
      title: "Confirmar Eliminación",
      message: `¿Está seguro de eliminar TODOS los jurados designados para la actividad "${actLabel}"? Esta acción retirará las designaciones (socios e invitados) y no se puede deshacer.`,
      confirmText: "Sí, eliminar jurados",
      actionType: "danger",
      onConfirm: async () => {
        setLoadingModal({ open: true, text: "Eliminando asignaciones de jurado..." });
        try {
          let query = supabase.from('jurado').delete();
          if (group.actividad_id) {
            query = query.eq('actividad_id', group.actividad_id);
          } else {
            query = query.eq('actividad_externa', group.actividad_externa);
          }
          
          const { error } = await query;
          if (error) throw error;
          
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: 'success',
            text: '¡Asignaciones eliminadas!',
            details: `Se han retirado todos los jurados de la actividad "${actLabel}" con éxito.`
          });
          cargarDatos();
        } catch (error) {
          console.error(error);
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: 'error',
            text: 'Error al eliminar',
            details: error.message || 'No se pudieron eliminar las asignaciones.'
          });
        }
      }
    });
  };

  const executeSubmit = async (esActividadExterna, nombresExternos) => {
    setSubmitting(true);
    setLoadingModal({
      open: true,
      text: isEditing ? "Guardando cambios en jurados..." : "Registrando jurados..."
    });
    try {
      // Si no estamos editando, validar que la actividad no tenga jurados ya asignados
      if (!isEditing) {
        const exists = jurados.some(j => 
          esActividadExterna 
            ? j.actividad_externa?.toLowerCase() === form.actividad_externa.trim().toLowerCase()
            : j.actividad_id === form.actividad_id
        );
        if (exists) {
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: 'error',
            text: 'Actividad ya asignada',
            details: 'Esta actividad ya tiene jurados designados. Use el botón "Modificar" en la tabla si desea cambiarlos.'
          });
          setSubmitting(false);
          return;
        }
      }

      // En caso de edición, eliminamos primero los jurados actuales de esta actividad
      if (isEditing) {
        let deleteQuery = supabase.from('jurado').delete();
        if (editingGroup.actividad_id) {
          deleteQuery = deleteQuery.eq('actividad_id', editingGroup.actividad_id);
        } else {
          deleteQuery = deleteQuery.eq('actividad_externa', editingGroup.actividad_externa);
        }
        const { error: delError } = await deleteQuery;
        if (delError) throw delError;
      }

      // Insertar todos los jurados nuevos en paralelo
      const promises = [];
      
      // 1. Socios seleccionados
      selectedMiembroIds.forEach(mId => {
        promises.push(
          academicoApi.asignarJurado({
            actividad_id: esActividadExterna ? null : form.actividad_id,
            actividad_externa: esActividadExterna ? form.actividad_externa.trim() : null,
            miembro_id: mId,
            descripcion: form.descripcion
          })
        );
      });

      // 2. Jurados externos
      nombresExternos.forEach(extName => {
        const finalDescripcion = `[JURADO EXTERNO: ${extName}] ${form.descripcion}`.trim();
        promises.push(
          academicoApi.asignarJurado({
            actividad_id: esActividadExterna ? null : form.actividad_id,
            actividad_externa: esActividadExterna ? form.actividad_externa.trim() : null,
            miembro_id: null,
            descripcion: finalDescripcion
          })
        );
      });

      await Promise.all(promises);
      
      setLoadingModal({ open: false, text: "" });
      setResultModal({
        open: true,
        type: 'success',
        text: isEditing ? '¡Modificación exitosa!' : '¡Asignación guardada con éxito!',
        details: isEditing
          ? 'Los jurados de la actividad se han actualizado correctamente.'
          : 'Todos los jurados seleccionados han sido designados de manera correcta.'
      });
      
      setIsModalOpen(false);
      cargarDatos();
    } catch (error) {
      console.error(error);
      setLoadingModal({ open: false, text: "" });
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se pudo guardar la asignación',
        details: error.message || 'Error de conexión o base de datos.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const esActividadExterna = form.es_externa === 'true';
    const nombresExternos = Array.from(new Set(externalJurados.map(j => j.nombre.trim()).filter(Boolean)));

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
    if (!isEditing && selectedMiembroIds.length === 0 && nombresExternos.length === 0) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Datos incompletos',
        details: 'Debe asignar al menos un jurado (socio o externo) a la actividad.'
      });
      return;
    }

    const actLabel = esActividadExterna 
      ? form.actividad_externa.trim() 
      : (actividades.find(a => String(a.id) === String(form.actividad_id))?.titulo || 'la actividad seleccionada');
      
    setConfirmModal({
      open: true,
      title: isEditing ? "Confirmar Modificación" : "Confirmar Asignación",
      message: isEditing 
        ? `¿Está seguro de que desea guardar los cambios en la designación de jurados para la actividad "${actLabel}"? Se actualizarán las designaciones actuales.`
        : `¿Está seguro de que desea registrar la designación de jurados para la actividad "${actLabel}" con los socios e invitados seleccionados?`,
      confirmText: isEditing ? "Sí, guardar cambios" : "Sí, registrar jurado",
      actionType: "primary",
      onConfirm: () => executeSubmit(esActividadExterna, nombresExternos)
    });
  };

  const asignacionesAgrupadas = useMemo(() => {
    const groups = {};
    jurados.forEach(j => {
      const key = j.actividad_id ? `int_${j.actividad_id}` : `ext_${j.actividad_externa}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          actividad_id: j.actividad_id,
          actividad_externa: j.actividad_externa,
          actividad: j.actividad,
          juradosList: [],
          descripcionActividad: ''
        };
      }
      
      let isExterno = !j.miembro_id;
      let originalDescripcion = j.descripcion || '';
      
      const nombre = isExterno
        ? (j.descripcion?.match(/\[JURADO EXTERNO:\s*(.*?)\]/)?.[1] || 'Jurado Externo')
        : (j.miembro ? `${j.miembro.nombre} ${j.miembro.apellidoPaterno || ''} ${j.miembro.apellidoMaterno || ''}`.trim() : 'Miembro');

      if (isExterno) {
        originalDescripcion = j.descripcion?.replace(/\[JURADO EXTERNO:\s*(.*?)\]/, '').trim() || '';
      }
      
      groups[key].juradosList.push({
        id: j.id,
        miembro_id: j.miembro_id,
        nombre,
        isExterno,
        originalDescripcion,
        rawItem: j
      });
      
      if (originalDescripcion && !groups[key].descripcionActividad) {
        groups[key].descripcionActividad = originalDescripcion;
      }
    });
    
    return Object.values(groups);
  }, [jurados]);

  const filtrados = useMemo(() => {
    if (!searchTerm.trim()) return asignacionesAgrupadas;
    const query = searchTerm.toLowerCase();
    return asignacionesAgrupadas.filter(g => {
      const actName = g.actividad?.titulo || g.actividad_externa || '';
      const matchesAct = actName.toLowerCase().includes(query);
      const matchesJur = g.juradosList.some(jur => jur.nombre.toLowerCase().includes(query));
      return matchesAct || matchesJur;
    });
  }, [asignacionesAgrupadas, searchTerm]);

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
        <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
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
                  <th className="px-6 py-3.5">Actividad</th>
                  <th className="px-6 py-3.5">Jurados Designados</th>
                  <th className="px-6 py-3.5">Descripción General</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((g) => (
                  <tr key={g.key} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {g.actividad?.titulo ? (
                        g.actividad.titulo
                      ) : g.actividad_externa ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                          {g.actividad_externa} (Externa)
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">General</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {g.juradosList.map((jur, idx) => (
                          <span 
                            key={idx} 
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                              jur.isExterno 
                                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {jur.nombre}
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                              jur.isExterno ? 'text-amber-500' : 'text-blue-500'
                            }`}>
                              {jur.isExterno ? 'Invitado' : 'Socio'}
                            </span>
                          </span>
                        ))}
                        {g.juradosList.length === 0 && (
                          <span className="text-slate-400 italic text-xs">Sin jurados asignados</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {g.descripcionActividad || <span className="text-slate-400 italic text-xs">Sin descripción</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(() => {
                        const isSealed = !!g.actividad?.blockchain_tx_id;
                        return (
                          <div className="flex justify-end gap-1.5 items-center">
                            <button
                              type="button"
                              onClick={() => handleVerDetalle(g)}
                              className="rounded p-1 text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Ver detalles de asignación"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModificar(g)}
                              disabled={isSealed}
                              className={`rounded p-1 transition-colors ${
                                isSealed 
                                  ? 'text-slate-300 cursor-not-allowed' 
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isSealed ? "No se puede modificar una actividad sellada en la blockchain" : "Modificar"}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarGrupo(g)}
                              disabled={isSealed}
                              className={`rounded p-1 transition-colors ${
                                isSealed 
                                  ? 'text-slate-300 cursor-not-allowed' 
                                  : 'text-red-500 hover:bg-red-50'
                              }`}
                              title={isSealed ? "No se puede eliminar jurados de una actividad sellada en la blockchain" : "Eliminar permanentemente"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
 
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditing ? "Modificar Jurados de Actividad" : "Asignar Jurado a Actividad"} 
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SECCIÓN 1: Selección de Actividad */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Actividad a evaluar</h3>
            
            <Select
              label="Origen de la Actividad"
              name="es_externa"
              value={form.es_externa}
              onChange={handleChange}
              disabled={isEditing}
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
                  disabled={isEditing}
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
                  disabled={isEditing}
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
                  disabled={isEditing}
                />
              </div>
            )}
          </div>

          {/* SECCIÓN 2: Jurados Socios (Internos) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Socios Miembros (Jurados Internos)</h3>
            
            <div className="animate-in fade-in duration-200 space-y-2">
              <Input
                placeholder="Buscar socio por nombre..."
                value={searchMiembroQuery}
                onChange={(e) => setSearchMiembroQuery(e.target.value)}
                className="h-9 text-xs mb-1 bg-white"
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
                        <span className="font-semibold text-slate-800">{m.nombre} {m.apellidoPaterno || ''} {m.apellidoMaterno || ''}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                {selectedMiembroIds.length} socio(s) seleccionado(s)
              </p>
            </div>
          </div>

          {/* SECCIÓN 3: Jurados Externos (Invitados Especiales) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Jurados Externos (Invitados)</h3>
              <Button 
                type="button" 
                variant="outline" 
                onClick={addExternalJurado}
                className="h-8 px-2 text-xs flex items-center gap-1 bg-white hover:bg-slate-100 hover:text-blue-600 border-slate-200"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Invitado
              </Button>
            </div>

            {externalJurados.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-200/50">
                Ninguno. Haga clic en "Agregar Invitado" si desea incluir jurados externos.
              </p>
            ) : (
              <div className="space-y-2">
                {externalJurados.map((ext) => (
                  <div key={ext.id} className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
                    {ext.isEditing ? (
                      <>
                        <Input
                          placeholder="Nombre completo del jurado externo..."
                          value={ext.nombre}
                          onChange={(e) => handleExternalNameChange(ext.id, e.target.value)}
                          className="flex-1 h-9 text-sm bg-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleEditExternal(ext.id, false)}
                          disabled={!ext.nombre.trim()}
                          className={`p-2 rounded-lg transition-colors shrink-0 ${
                            !ext.nombre.trim() 
                              ? 'text-slate-300 cursor-not-allowed' 
                              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title="Confirmar nombre"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200/50 text-sm font-semibold text-slate-800 break-words">
                          {ext.nombre || <span className="text-slate-400 italic font-normal">Sin nombre</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleEditExternal(ext.id, true)}
                          className="p-2 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors shrink-0"
                          title="Editar nombre"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExternalJurado(ext.id)}
                      className="p-2 text-red-500 hover:bg-rose-50 hover:text-red-700 rounded-lg transition-colors shrink-0"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
 
          <Input
            label="Descripción o Rol General en la Actividad (Opcional)"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej. Presidente de mesa, evaluadores de proyecto, jurado calificador..."
          />
 
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button 
              type="submit" 
              disabled={submitting || isSubmitDisabled}
              className={isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""}
            >
              {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditing ? "Guardar Cambios" : "Guardar Asignación"}
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

      {/* Modal de Detalle de Asignación */}
      <Modal 
        isOpen={detalleModal.open} 
        onClose={() => setDetalleModal({ open: false, group: null })} 
        title="Detalle de Asignación de Jurados"
        width="max-w-2xl"
      >
        {detalleModal.group && (
          <div className="space-y-5 text-sm text-slate-700">
            <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Actividad</p>
              <h3 className="text-lg font-bold text-slate-900">
                {detalleModal.group.actividad?.titulo || detalleModal.group.actividad_externa}
              </h3>
              
              {detalleModal.group.actividad ? (
                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-200/60 text-xs text-slate-500">
                  <div>
                    <span className="font-semibold text-slate-600">Fecha:</span> {new Date(detalleModal.group.actividad.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Hora:</span> {detalleModal.group.actividad.hora?.substring(0, 5)} Hrs
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 mt-1">
                    <span className="font-semibold text-slate-600">Estado Blockchain:</span>
                    {detalleModal.group.actividad.blockchain_tx_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">
                        <ShieldCheck className="h-3 w-3 text-blue-600" /> Sellado en Blockchain
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        <Shield className="h-3 w-3" /> Pendiente de Sello
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 mt-1 self-start">
                  Actividad Externa
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Jurados Designados</h4>
              <div className="space-y-2">
                {detalleModal.group.juradosList.map((jur, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-slate-400 bg-slate-100 rounded-full h-6 w-6 flex items-center justify-center text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{jur.nombre}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      jur.isExterno 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {jur.isExterno ? 'Invitado Especial' : 'Socio Miembro'}
                    </span>
                  </div>
                ))}
                {detalleModal.group.juradosList.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">No hay jurados asignados para esta actividad.</p>
                )}
              </div>
            </div>

            {detalleModal.group.descripcionActividad && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción o Rol Evaluativo</h4>
                <p className="text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                  {detalleModal.group.descripcionActividad}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button onClick={() => setDetalleModal({ open: false, group: null })}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal General de Confirmación */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        title={
          <div className={`flex items-center gap-2.5 ${confirmModal.actionType === 'danger' ? 'text-red-600' : 'text-blue-600'}`}>
            <Info className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>{confirmModal.title}</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className={`flex items-start gap-3 p-3 rounded-lg text-sm border ${
            confirmModal.actionType === 'danger'
              ? 'bg-red-50 border-red-100 text-red-800'
              : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
            <Info className={`h-5 w-5 shrink-0 mt-0.5 ${confirmModal.actionType === 'danger' ? 'text-red-600' : 'text-blue-600'}`} />
            <div>
              <span>{confirmModal.message}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                if (confirmModal.onConfirm) confirmModal.onConfirm();
              }}
              variant={confirmModal.actionType === 'danger' ? 'danger' : 'primary'}
            >
              {confirmModal.confirmText || 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
    </div>
  );
};
