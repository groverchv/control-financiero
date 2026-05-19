import { useState } from 'react';
import { Edit, Eye, EyeOff, Info, Plus, Search, Lightbulb, ChevronLeft, ChevronRight, UserX, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMiembros } from '../hooks';
import { Button, Input, Spinner, Modal, ExportButtons } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast } from '../../../components/feedback';
import { administracionApi } from '../api';

export const GestionMiembrosPage = () => {
  const { miembros, loading, error, setMiembros } = useMiembros();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [searchTerm, setSearchTerm] = useState('');
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
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [statusConfirmModal, setStatusConfirmModal] = useState({ open: false, miembro: null, nuevoEstado: 'activo' });
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });

  const columns = [
    { key: 'foto_display', label: 'Foto' },
    { key: 'nombre_completo', label: 'Nombre Completo' },
    { key: 'email', label: 'Correo' },
    { key: 'telefono', label: 'Teléfono' },
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

  const handleToggleEstado = (miembro) => {
    const nuevoEstado = miembro.estado === 'activo' ? 'inactivo' : 'activo';
    setStatusConfirmModal({
      open: true,
      miembro,
      nuevoEstado
    });
  };

  const executeToggleEstado = async () => {
    const { miembro, nuevoEstado } = statusConfirmModal;
    if (!miembro) return;

    setIsSubmitting(true);
    try {
      const actualizado = await administracionApi.actualizarMiembro(miembro.id, { estado: nuevoEstado });
      setMiembros(miembros.map(m => m.id === miembro.id ? actualizado : m));
      setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo' });
      setResultModal({
        open: true,
        type: 'success',
        text: nuevoEstado === 'activo' ? '¡Miembro Reactivado!' : '¡Miembro Desactivado!',
        details: `El estado del miembro ${miembro.nombre} ha sido actualizado a ${nuevoEstado} con éxito en la base de datos.`
      });
    } catch (err) {
      console.error(err);
      setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo' });
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al cambiar estado',
        details: err instanceof Error ? err.message : 'No se pudo actualizar el estado del miembro en Supabase.'
      });
    } finally {
      setIsSubmitting(false);
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
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error de validación',
        details: 'Las contraseñas ingresadas no coinciden. Por favor, verifíquelas.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMember) {
        // ACTUALIZAR
        const { password, confirmPassword, email, ...updates } = formData;
        const actualizado = await administracionApi.actualizarMiembro(editingMember.id, updates);
        setMiembros(miembros.map(m => m.id === editingMember.id ? actualizado : m));
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Miembro actualizado con éxito!',
          details: 'Los datos personales y de configuración del socio se han actualizado correctamente.'
        });
      } else {
        // CREAR
        const { confirmPassword, ...dataToSave } = formData;
        const nuevoMiembro = await administracionApi.crearMiembro(dataToSave);
        if (nuevoMiembro) {
          setMiembros([nuevoMiembro, ...miembros]);
        }
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Miembro registrado con éxito!',
          details: 'El nuevo miembro ha sido dado de alta correctamente. Recibirá un correo de bienvenida con sus credenciales.'
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: editingMember ? 'No se pudo actualizar los datos' : 'No se pudo registrar el miembro',
        details: err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado de miembros en tiempo real
  const filteredMiembros = miembros.filter(m => {
    const fullName = `${m.nombre || ''} ${m.apellidoPaterno || ''} ${m.apellidoMaterno || ''}`.toLowerCase();
    const email = (m.email || '').toLowerCase();
    const telefono = (m.telefono || '').toLowerCase();
    const rol = (m.rol || '').toLowerCase();
    const estado = (m.estado || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || 
           email.includes(search) || 
           telefono.includes(search) ||
           rol.includes(search) ||
           estado.includes(search);
  });

  const totalPages = Math.ceil(filteredMiembros.length / ITEMS_PER_PAGE);
  const paginatedMiembros = filteredMiembros.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const rows = paginatedMiembros.map((miembro) => ({
    ...miembro,
    foto_display: (
      <div 
        className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => miembro.foto && setImageModal({ open: true, url: miembro.foto })}
      >
        {miembro.foto ? (
          <img src={miembro.foto} alt={miembro.nombre} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
            {miembro.nombre?.charAt(0)}
          </div>
        )}
      </div>
    ),
    nombre_completo: (
      <div className="font-semibold text-slate-900">
        {`${miembro.nombre} ${miembro.apellidoPaterno || ''} ${miembro.apellidoMaterno || ''}`.trim()}
      </div>
    ),
    email: (
      <span className="text-slate-600">{miembro.email}</span>
    ),
    telefono: (
      <span className="text-slate-600 font-mono text-xs">{miembro.telefono || '-'}</span>
    ),
    rol: (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
        miembro.rol === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
        miembro.rol === 'secretario' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
        'bg-slate-50 text-slate-700 border-slate-100'
      }`}>
        {miembro.rol}
      </span>
    ),
    estado: (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
        miembro.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
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
        {miembro.estado === 'activo' ? (
          <button 
            onClick={() => handleToggleEstado(miembro)}
            className="rounded p-1 text-red-600 hover:bg-red-50"
            title="Desactivar miembro"
          >
            <UserX className="h-4 w-4" />
          </button>
        ) : (
          <button 
            onClick={() => handleToggleEstado(miembro)}
            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
            title="Activar miembro"
          >
            <UserCheck className="h-4 w-4" />
          </button>
        )}
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
            data={miembros.map(m => ({ 
              'Nombre Completo': `${m.nombre} ${m.apellidoPaterno || ''} ${m.apellidoMaterno || ''}`.trim(), 
              Email: m.email, 
              Telefono: m.telefono || '-', 
              Rol: m.rol, 
              Estado: m.estado 
            }))} 
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex w-full max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, correo, teléfono, rol..."
              className="flex-1"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <span className="text-sm text-slate-500">{filteredMiembros.length} registros</span>
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
            <>
              <Table columns={columns} rows={rows} emptyMessage="No hay miembros registrados." />
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                  <p className="text-xs text-slate-500">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredMiembros.length)} de {filteredMiembros.length} miembros
                  </p>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      className="h-8 px-2 text-xs" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "outline"}
                        className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button 
                      variant="outline" 
                      className="h-8 px-2 text-xs" 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMember ? 'Editar miembro' : 'Registrar nuevo miembro'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sección de Datos Personales */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Datos Personales</h3>
            
            <Input 
              label="Nombres" 
              value={formData.nombre} 
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
              required 
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Sección de Contacto */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Información de Contacto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Correo Electrónico" 
                type="email"
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                required 
                disabled={!!editingMember}
              />
              <Input 
                label="Teléfono" 
                value={formData.telefono} 
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
              />
            </div>
          </div>
          
          {/* Sección de Credenciales (Solo para Nuevos Miembros) */}
          {!editingMember && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credenciales de Acceso</h3>
              
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
            </div>
          )}

          {/* Sección de Configuración Administrativa */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold text-slate-500">Configuración del Sistema</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
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

      {/* Modal premium de confirmación de cambio de estado */}
      <Modal
        isOpen={statusConfirmModal.open}
        onClose={() => setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo' })}
        title={
          statusConfirmModal.nuevoEstado === 'inactivo' ? (
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="h-5.5 w-5.5 stroke-[2.5]" />
              <span>Desactivar Miembro</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-emerald-600">
              <CheckCircle2 className="h-5.5 w-5.5 stroke-[2.5]" />
              <span>Reactivar Miembro</span>
            </div>
          )
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              {statusConfirmModal.nuevoEstado === 'inactivo' ? (
                <span>
                  ¿Estás seguro de desactivar al miembro <strong>{statusConfirmModal.miembro?.nombre}</strong>? 
                  Esto deshabilitará su acceso de sesión, detendrá las notificaciones y pausará la generación de cobros de cuotas.
                </span>
              ) : (
                <span>
                  ¿Estás seguro de reactivar al miembro <strong>{statusConfirmModal.miembro?.nombre}</strong>? 
                  Esto restaurará su acceso de inicio de sesión y la recepción de notificaciones institucionales.
                </span>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo' })}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              variant={statusConfirmModal.nuevoEstado === 'inactivo' ? 'danger' : 'primary'}
              onClick={executeToggleEstado}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Procesando...' : statusConfirmModal.nuevoEstado === 'inactivo' ? 'Confirmar Desactivación' : 'Confirmar Reactivación'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para ver imagen en grande */}
      <Modal 
        isOpen={imageModal.open} 
        onClose={() => setImageModal({ open: false, url: null })} 
        title="Fotografía de Perfil"
      >
        <div className="flex justify-center bg-slate-900/5 rounded-xl p-2 overflow-hidden">
          {imageModal.url && (
            <img 
              src={imageModal.url} 
              alt="Perfil ampliado" 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Operación Exitosa" : "Error en Operación"} 
        width="max-w-md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {resultModal.type === 'success' ? (
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          ) : (
            <div className="rounded-full bg-rose-100 p-3 text-rose-600">
              <AlertTriangle className="h-12 w-12" />
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
