import { useState } from 'react';
import { Edit, Eye, EyeOff, Info, Plus, Search, Trash2, Lightbulb } from 'lucide-react';
import { useMiembros } from '../hooks';
import { Button, Input, Spinner, Modal, ExportButtons } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { administracionApi } from '../api';

export const GestionMiembrosPage = () => {
  const { miembros, loading, error, setMiembros } = useMiembros();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    apellidoPaterno: '', 
    apellidoMaterno: '', 
    email: '', 
    telefono: '', 
    password: '', 
    confirmPassword: '',
    rol: 'socio', 
    estado: 'activo' 
  });
  const [detailModal, setDetailModal] = useState({ open: false, miembro: null, inscripciones: [], notificaciones: [], cvUrl: null, loading: false, tab: 'inscripciones' });
  const [talentSearchModal, setTalentSearchModal] = useState({ open: false, queryProf: '', queryDesc: '', results: [] });

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'rol', label: 'Rol' },
    { key: 'estado', label: 'Estado' },
    { key: 'acciones', label: 'Acciones' },
  ];

  const handleOpenCreate = () => {
    setEditingMember(null);
    setFormData({ 
      nombre: '', 
      apellidoPaterno: '', 
      apellidoMaterno: '', 
      email: '', 
      telefono: '', 
      password: '', 
      confirmPassword: '',
      rol: 'socio', 
      estado: 'activo' 
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (miembro) => {
    setEditingMember(miembro);
    setFormData({
      nombre: miembro.nombre,
      apellidoPaterno: miembro.apellidoPaterno || '',
      apellidoMaterno: miembro.apellidoMaterno || '',
      email: miembro.email,
      telefono: miembro.telefono || '',
      password: '',
      confirmPassword: '',
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

  const handleOpenDetail = async (miembro) => {
    setDetailModal({ open: true, miembro, inscripciones: [], notificaciones: [], cvUrl: null, loading: true, tab: 'inscripciones' });
    try {
      const [inscripciones, notificaciones, cvUrl] = await Promise.all([
        administracionApi.obtenerInscripcionesMiembro(miembro.id),
        administracionApi.obtenerNotificacionesMiembro(miembro.id),
        administracionApi.obtenerDocumentoMiembro(miembro.id),
      ]);
      setDetailModal(prev => ({ ...prev, inscripciones, notificaciones, cvUrl, loading: false }));
    } catch (err) {
      console.error('Error cargando detalle:', err);
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  };


  const handleSearchTalent = (queryProf, queryDesc) => {
    if (!queryProf.trim() && !queryDesc.trim()) {
      setTalentSearchModal(prev => ({ ...prev, queryProf, queryDesc, results: [] }));
      return;
    }
    
    const termsProf = queryProf.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const termsDesc = queryDesc.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const scored = miembros.map(m => {
      let score = 0;
      const prof = (m.profesion || '').toLowerCase();
      const bio = (m.biografia || '').toLowerCase();
      
      termsProf.forEach(term => {
        if (prof.includes(term)) score += 5;
      });

      termsDesc.forEach(term => {
        if (bio.includes(term)) score += 2;
      });
      
      return { ...m, score };
    }).filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      
    setTalentSearchModal(prev => ({ ...prev, queryProf, queryDesc, results: scored }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingMember && formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMember) {
        // ACTUALIZAR
        const { password, confirmPassword, email, ...updates } = formData;
        const actualizado = await administracionApi.actualizarMiembro(editingMember.id, updates);
        setMiembros(miembros.map(m => m.id === editingMember.id ? actualizado : m));
      } else {
        // CREAR
        const { confirmPassword, ...dataToSave } = formData;
        const nuevoMiembro = await administracionApi.crearMiembro(dataToSave);
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
          onClick={() => handleOpenDetail(miembro)}
          className="rounded p-1 text-slate-600 hover:bg-slate-50"
          title="Ver detalle"
        >
          <Info className="h-4 w-4" />
        </button>
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
        <div className="flex gap-2">
          <ExportButtons 
            data={miembros.map(m => ({ Nombre: m.nombre, Email: m.email, Telefono: m.telefono, Rol: m.rol, Estado: m.estado }))} 
            filename="lista_miembros" 
            title="Listado de Miembros Institucionales" 
          />
          <Button variant="outline" type="button" onClick={() => setTalentSearchModal({ open: true, query: '', results: [] })}>
            <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
            Buscador de Talentos
          </Button>
          <Button type="button" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Nuevo miembro
          </Button>
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Input 
                  label="Contraseña" 
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input 
                label="Confirmar Contraseña" 
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword} 
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                required 
              />
            </div>
          )}

          <Input 
            label="Teléfono" 
            value={formData.telefono} 
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Apellido Paterno" 
              value={formData.apellidoPaterno || ''} 
              onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })} 
            />
            <Input 
              label="Apellido Materno" 
              value={formData.apellidoMaterno || ''} 
              onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })} 
            />
          </div>

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

      {/* Modal de detalle del miembro */}
      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal(prev => ({ ...prev, open: false }))}
        title={`Detalle de: ${detailModal.miembro?.nombre || ''}`}
      >
        <div className="space-y-4">
          {/* Info basica */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-semibold text-slate-500">Correo:</span> <span className="text-slate-800">{detailModal.miembro?.email}</span></div>
            <div><span className="font-semibold text-slate-500">Telefono:</span> <span className="text-slate-800">{detailModal.miembro?.telefono || '-'}</span></div>
            <div><span className="font-semibold text-slate-500">Rol:</span> <span className="text-slate-800">{detailModal.miembro?.rol}</span></div>
            <div><span className="font-semibold text-slate-500">Estado:</span> <span className="text-slate-800">{detailModal.miembro?.estado}</span></div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setDetailModal(prev => ({ ...prev, tab: 'inscripciones' }))}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                detailModal.tab === 'inscripciones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Inscripciones ({detailModal.inscripciones.length})
            </button>
            <button
              onClick={() => setDetailModal(prev => ({ ...prev, tab: 'notificaciones' }))}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                detailModal.tab === 'notificaciones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Notificaciones 
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${detailModal.notificaciones.some(n => n.estado !== 'leida') ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                {detailModal.notificaciones.filter(n => n.estado !== 'leida').length} sin leer
              </span>
            </button>
            <button
              onClick={() => setDetailModal(prev => ({ ...prev, tab: 'cv' }))}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                detailModal.tab === 'cv' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Documento CV
            </button>
          </div>

          {detailModal.loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-500">
              <Spinner size="sm" /> Cargando informacion...
            </div>
          ) : detailModal.tab === 'inscripciones' ? (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {detailModal.inscripciones.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No tiene inscripciones registradas.</p>
              ) : detailModal.inscripciones.map((insc, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm border border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800">{insc.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {insc.tipo === 'evento' ? 'Evento' : 'Actividad Academica'} &mdash; {insc.fecha ? new Date(insc.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${insc.tipo === 'evento' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {insc.tipo === 'evento' ? 'Evento' : 'Curso'}
                  </span>
                </div>
              ))}
            </div>
          ) : detailModal.tab === 'notificaciones' ? (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {detailModal.notificaciones.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No tiene notificaciones registradas.</p>
              ) : detailModal.notificaciones.map((notif, i) => (
                <div key={i} className={`rounded-lg px-4 py-3 text-sm border ${notif.estado !== 'leida' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {notif.estado !== 'leida' && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                      <p className={`font-semibold ${notif.estado !== 'leida' ? 'text-slate-900' : 'text-slate-800'}`}>{notif.titulo}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{notif.creacion ? new Date(notif.creacion).toLocaleDateString('es-ES') : ''}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{notif.descripcion}</p>
                </div>
              ))}
            </div>
          ) : detailModal.tab === 'cv' ? (
            <div className="space-y-4">
              {detailModal.cvUrl ? (
                <div className="flex flex-col items-center">
                  <div className="w-full flex justify-end mb-2">
                    <a href={detailModal.cvUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium">Abrir en nueva pestaña</a>
                  </div>
                  <iframe src={detailModal.cvUrl} className="w-full h-80 border rounded-lg bg-slate-50" title="CV del Miembro"></iframe>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">El socio no ha subido su CV.</p>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal isOpen={talentSearchModal.open} onClose={() => setTalentSearchModal({ open: false, queryProf: '', queryDesc: '', results: [] })} title="Buscador Inteligente de Talentos">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Encuentra perfiles completando uno o ambos campos. Mostraremos el top 10 con mayor coincidencia.
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="queryProf" className="block text-xs font-medium text-slate-700 mb-1">Profesión / Título</label>
              <Input 
                id="queryProf"
                name="queryProf"
                placeholder="Ej: Ingeniero de Sistemas, Diseñador..."
                value={talentSearchModal.queryProf}
                onChange={(e) => handleSearchTalent(e.target.value, talentSearchModal.queryDesc)}
                className="w-full"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="queryDesc" className="block text-xs font-medium text-slate-700 mb-1">Resumen Profesional / Habilidades</label>
              <Input 
                id="queryDesc"
                name="queryDesc"
                placeholder="Ej: Desarrollo web, React, finanzas corporativas..."
                value={talentSearchModal.queryDesc}
                onChange={(e) => handleSearchTalent(talentSearchModal.queryProf, e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-2">
            {(talentSearchModal.queryProf || talentSearchModal.queryDesc) && talentSearchModal.results.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No se encontraron perfiles que coincidan con la búsqueda.</p>
            ) : (
              talentSearchModal.results.map((m, index) => (
                <div key={m.id} className="p-3 border border-slate-100 bg-slate-50 rounded flex justify-between items-center hover:border-emerald-200 transition-colors">
                  <div className="flex-1 pr-4">
                    <p className="font-semibold text-slate-800 text-sm">{index + 1}. {m.nombre} {m.apellidoPaterno}</p>
                    <p className="text-xs text-emerald-600 font-medium">{m.profesion || 'Sin profesión registrada'}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={m.biografia}>{m.biografia || 'Sin descripción'}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setTalentSearchModal({ open: false, queryProf: '', queryDesc: '', results: [] });
                      handleOpenDetail(m);
                    }}
                  >
                    Ver Perfil
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
