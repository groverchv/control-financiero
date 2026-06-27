import { useState, useEffect, useMemo } from 'react';
import { Edit, Eye, Plus, Search, Lightbulb, ChevronLeft, ChevronRight, UserX, UserCheck, AlertTriangle, CheckCircle2, UserCircle, RefreshCw, Info } from 'lucide-react';
import { useMiembros } from '../hooks';
import { useMiembroForm } from '../hooks/useMiembroForm';
import { useMiembroDetail } from '../hooks/useMiembroDetail';
import { HighlightMatch } from '../../../utils/textHighlight';
import { Button, Input, Spinner, Modal, ExportButtons, Skeleton, Confetti } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { administracionApi } from '../api';
import { finanzasApi } from '../../finanzas/api';
import { supabase } from '../../../services/supabase';

// --- Componentes modales extraídos (Mantenibilidad) ---
import { MiembroFormModal } from '../components/MiembroFormModal';
import { MiembroDetailModal } from '../components/MiembroDetailModal';
import { StatusConfirmModal } from '../components/StatusConfirmModal';
import { TalentSearchModal } from '../components/TalentSearchModal';

const ITEMS_PER_PAGE = 10;

export const GestionMiembrosPage = () => {
  const { miembros, loading, error, setMiembros, refetch } = useMiembros();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSyncCompleted = () => {
      refetch();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-completed', handleSyncCompleted);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-completed', handleSyncCompleted);
    };
  }, [refetch]);

  const [globalConfig, setGlobalConfig] = useState({ monto_cuota: 20 });

  useEffect(() => {
    const fetchGlobalConfig = async () => {
      try {
        const cfg = await finanzasApi.obtenerConfiguracionCuotas();
        if (cfg) {
          setGlobalConfig({
            monto_cuota: cfg.monto_cuota || 20
          });
        }
      } catch (err) {
        console.warn('Error fetching global config for defaults:', err);
      }
    };
    fetchGlobalConfig();
  }, []);

  // --- Hooks extraídos (Mantenibilidad) ---
  const {
    isModalOpen,
    setIsModalOpen,
    editingMember,
    formData,
    setFormData,
    emailError,
    checkEmailUniqueness,
    isFormUnchanged,
    handleOpenCreate,
    handleOpenEdit,
    clearDraft
  } = useMiembroForm(miembros);

  const { detailModal, setDetailModal, handleOpenDetail } = useMiembroDetail();

  // --- Estado local de la página ---
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [talentSearchModal, setTalentSearchModal] = useState({ open: false, queryProf: '', queryDesc: '', results: [] });
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [statusConfirmModal, setStatusConfirmModal] = useState({ open: false, miembro: null, nuevoEstado: 'activo', reactivationMode: 'resume' });
  const [confirmActionModal, setConfirmActionModal] = useState({ open: false });
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  const [loadingModal, setLoadingModal] = useState({ open: false, text: '' });

  const columns = [
    { key: 'foto_display', label: 'Foto' },
    { key: 'nombre_completo', label: 'Nombre Completo' },
    { key: 'email', label: 'Correo' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'rol', label: 'Rol' },
    { key: 'estado', label: 'Estado' },
    { key: 'acciones', label: 'Acciones' },
  ];

  // --- Handlers de negocio ---

  const handleToggleEstado = (miembro) => {
    const nuevoEstado = miembro.estado === 'activo' ? 'inactivo' : 'activo';
    setStatusConfirmModal({
      open: true,
      miembro,
      nuevoEstado,
      reactivationMode: 'resume'
    });
  };

  const executeToggleEstado = async () => {
    const { miembro, nuevoEstado, reactivationMode } = statusConfirmModal;
    if (!miembro) return;

    const estadoAnterior = miembro.estado;

    // Actualización optimista local inmediata
    setMiembros(prev => prev.map(m => m.id === miembro.id ? { ...m, estado: nuevoEstado } : m));

    setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo', reactivationMode: 'resume' });
    setIsSubmitting(true);
    try {
      const updates = { estado: nuevoEstado };
      if (nuevoEstado === 'activo' && reactivationMode === 'reset') {
        updates.tiempo_restante_cuota = null;
      }
      const actualizado = await administracionApi.actualizarMiembro(miembro.id, updates);
      const miembroFusionado = actualizado ? { ...miembro, ...actualizado } : { ...miembro, estado: nuevoEstado };
      setMiembros(prev => prev.map(m => m.id === miembro.id ? miembroFusionado : m));
    } catch (err) {
      console.error(err);
      // Revertir (Rollback) estado si hay error
      setMiembros(prev => prev.map(m => m.id === miembro.id ? { ...m, estado: estadoAnterior } : m));
      
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

  const handleSearchTalent = (queryProf = '', queryDesc = '') => {
    const qProf = queryProf || '';
    const qDesc = queryDesc || '';
    if (!qProf.trim() && !qDesc.trim()) {
      setTalentSearchModal(prev => ({ ...prev, queryProf: qProf, queryDesc: qDesc, results: [] }));
      return;
    }
    
    const normalize = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    
    const termsProf = normalize(qProf).split(/\s+/).filter(t => t.length > 0);
    const termsDesc = normalize(qDesc).split(/\s+/).filter(t => t.length > 0);
    
    const scored = miembros.map(m => {
      let score = 0;
      const prof = normalize(m.profesion);
      const bio = normalize(m.biografia);
      
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
      
    setTalentSearchModal(prev => ({ ...prev, queryProf: qProf, queryDesc: qDesc, results: scored }));
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();

    if (emailError) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error de validación',
        details: emailError
      });
      return;
    }

    // Validación unificada de contraseña (crear o editar)
    const needsPasswordValidation = !editingMember || (editingMember && formData.password);
    if (needsPasswordValidation) {
      if (formData.password !== formData.confirmPassword) {
        setResultModal({
          open: true,
          type: 'error',
          text: 'Error de validación',
          details: 'Las contraseñas ingresadas no coinciden. Por favor, verifíquelas.'
        });
        return;
      }
      if (formData.password.length < 8) {
        setResultModal({
          open: true,
          type: 'error',
          text: 'Contraseña insegura',
          details: 'La contraseña debe tener al menos 8 caracteres por seguridad.'
        });
        return;
      }
    }

    setConfirmActionModal({ open: true });
  };

  const executeSubmit = async () => {
    setConfirmActionModal({ open: false });
    setIsSubmitting(true);
    setLoadingModal({
      open: true,
      text: editingMember ? 'Actualizando datos del miembro...' : 'Registrando nuevo miembro...'
    });
    try {
      if (editingMember) {
        // ACTUALIZAR
        const updates = { ...formData };
        const { password } = updates;
        delete updates.password;
        delete updates.confirmPassword;
        
        if (password) {
          await administracionApi.actualizarContrasena(editingMember.id, password);
        }

        const actualizado = await administracionApi.actualizarMiembro(editingMember.id, updates);
        const miembroSincronizado = actualizado
          ? {
              ...editingMember,
              ...actualizado,
              contrasena: password ? password : editingMember.contrasena
            }
          : {
              ...editingMember,
              ...updates,
              contrasena: password ? password : editingMember.contrasena
            };

        setMiembros(miembros.map(m => m.id === editingMember.id ? miembroSincronizado : m));

        // R3: Detalle de Cambios en Notificaciones
        const changedFields = [];
        if (formData.nombre !== editingMember.nombre) changedFields.push('Nombre');
        if ((formData.apellidoPaterno || '') !== (editingMember.apellidoPaterno || '')) changedFields.push('Apellido Paterno');
        if ((formData.apellidoMaterno || '') !== (editingMember.apellidoMaterno || '')) changedFields.push('Apellido Materno');
        if (formData.email !== editingMember.email) changedFields.push('Correo');
        if ((formData.telefono || '') !== (editingMember.telefono || '')) changedFields.push('Teléfono');
        if (formData.rol !== editingMember.rol) changedFields.push('Rol');
        if (formData.estado !== editingMember.estado) changedFields.push('Estado');

        let descNotif = 'Actualización de perfil por la administración.';
        if (changedFields.length > 0) {
          descNotif = `Campos actualizados: ${changedFields.join(', ')}.`;
        }
        if (password) {
          descNotif += ' Contraseña modificada.';
        }

        // Crear notificación del sistema (sólo si estamos online)
        if (navigator.onLine) {
          try {
            await supabase.from('notificacion').insert([{
              miembro_id: editingMember.id,
              titulo: password ? 'Credenciales Actualizadas' : 'Actualización de Perfil',
              descripcion: descNotif,
              estado: 'pendiente'
            }]);
          } catch (notifErr) {
            console.warn('[GestionMiembros] No se pudo guardar notificación (offline?):', notifErr);
          }
        }

        setLoadingModal({ open: false, text: '' });
        clearDraft();
        setShowConfetti(true);
        const wasOffline = actualizado?._offlinePending;
        setResultModal({
          open: true,
          type: 'success',
          text: wasOffline ? '¡Datos guardados localmente!' : '¡Miembro actualizado con éxito!',
          details: wasOffline
            ? 'Los datos se han guardado localmente y se sincronizarán automáticamente cuando recuperes la conexión a internet.'
            : (password 
              ? 'Los datos y la contraseña del socio se han actualizado correctamente en Supabase, y se ha registrado una notificación de sistema.'
              : 'Los datos personales y de configuración del socio se han actualizado correctamente y se ha registrado una notificación de sistema.')
        });
      } else {
        // CREAR
        const dataToSave = { ...formData };
        delete dataToSave.confirmPassword;
        const nuevoMiembro = await administracionApi.crearMiembro(dataToSave);
        if (nuevoMiembro) {
          setMiembros([nuevoMiembro, ...miembros]);
        }
        setLoadingModal({ open: false, text: '' });
        clearDraft();
        setShowConfetti(true);
        const wasOffline = nuevoMiembro?._offlinePending;
        setResultModal({
          open: true,
          type: 'success',
          text: wasOffline ? '¡Miembro guardado localmente!' : '¡Miembro registrado con éxito!',
          details: wasOffline
            ? 'No hay conexión a internet. El miembro ha sido guardado localmente y se registrará en la base de datos automáticamente cuando recuperes la señal.'
            : 'El nuevo miembro ha sido dado de alta correctamente. Recibirá un correo de bienvenida con sus credenciales.'
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
      const errMsg = err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql.';
      setResultModal({
        open: true,
        type: 'error',
        text: editingMember ? 'No se pudo actualizar los datos' : 'No se pudo registrar el miembro',
        details: errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('duplicate key') 
          ? 'Ya existe un miembro registrado con este mismo correo electrónico. Por favor intente con otro.' 
          : errMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado de miembros en tiempo real (memoizado para evitar re-cálculos innecesarios)
  const filteredMiembros = useMemo(() => miembros.filter(m => {
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
  }), [miembros, searchTerm]);

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
        <HighlightMatch text={`${miembro.nombre} ${miembro.apellidoPaterno || ''} ${miembro.apellidoMaterno || ''}`.trim()} query={searchTerm} />
      </div>
    ),
    email: (
      <span className="text-slate-600">
        <HighlightMatch text={miembro.email} query={searchTerm} />
      </span>
    ),
    telefono: (
      <span className="text-slate-600 font-mono text-xs">
        <HighlightMatch text={miembro.telefono || '-'} query={searchTerm} />
      </span>
    ),
    rol: (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
        miembro.rol === 'admin' ? 'badge-admin bg-blue-50 text-blue-700 border-blue-100' :
        miembro.rol === 'secretario' ? 'badge-secretario bg-indigo-50 text-indigo-700 border-indigo-100' :
        'badge-socio bg-slate-50 text-slate-700 border-slate-100'
      }`}>
        <HighlightMatch text={miembro.rol} query={searchTerm} />
      </span>
    ),
    estado: (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
        miembro.estado === 'activo' ? 'badge-activo bg-emerald-50 text-emerald-700 border-emerald-100' : 'badge-inactivo bg-slate-100 text-slate-600 border-slate-200'
      }`}>
        <HighlightMatch text={miembro.estado} query={searchTerm} />
      </span>
    ),
    acciones: (
      <div className="flex gap-2">
        <button 
          onClick={() => handleOpenDetail(miembro)}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          title="Ver detalle"
          aria-label={`Ver detalle de ${miembro.nombre || 'miembro'}`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Detalle</span>
        </button>
        <button 
          onClick={() => handleOpenEdit(miembro)}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
          title="Editar"
          aria-label={`Editar a ${miembro.nombre || 'miembro'}`}
        >
          <Edit className="h-3.5 w-3.5" />
          <span>Editar</span>
        </button>
        {miembro.estado === 'activo' ? (
          <button 
            onClick={() => handleToggleEstado(miembro)}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
            title="Desactivar miembro"
            aria-label={`Desactivar a ${miembro.nombre || 'miembro'}`}
          >
            <UserX className="h-3.5 w-3.5" />
            <span>Desactivar</span>
          </button>
        ) : (
          <button 
            onClick={() => handleToggleEstado(miembro)}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            title="Activar miembro"
            aria-label={`Activar a ${miembro.nombre || 'miembro'}`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Activar</span>
          </button>
        )}
      </div>
    )
  }));

  const totalMiembros = miembros.length;
  const sociosCount = miembros.filter(m => m.rol === 'socio' || m.rol === 'SOCIO').length;
  const secretariosCount = miembros.filter(m => m.rol === 'secretario' || m.rol === 'SECRETARIO').length;
  const adminCount = miembros.filter(m => m.rol === 'admin' || m.rol === 'ADMIN').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion de miembros</h1>
          <p className="text-sm text-slate-500">Administra el registro institucional de socios.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button 
            type="button" 
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none whitespace-nowrap h-9 flex items-center justify-center gap-2 px-3"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Nuevo miembro</span>
            <span className="sm:hidden text-xs">Nuevo</span>
          </Button>
        </div>
      </header>

      {/* Tarjetas de Métricas de Miembros */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <UserCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-slate-900 truncate">
              {loading ? (
                <span className="inline-block h-6 w-12 bg-slate-200 animate-pulse rounded" />
              ) : (
                totalMiembros
              )}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Total Miembros</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-emerald-600 truncate">
              {loading ? (
                <span className="inline-block h-6 w-12 bg-slate-200 animate-pulse rounded" />
              ) : (
                sociosCount
              )}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Miembros (Socios)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-rose-600 truncate">
              {loading ? (
                <span className="inline-block h-6 w-12 bg-slate-200 animate-pulse rounded" />
              ) : (
                secretariosCount
              )}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Secretarios</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-indigo-600 truncate">
              {loading ? (
                <span className="inline-block h-6 w-12 bg-slate-200 animate-pulse rounded" />
              ) : (
                adminCount
              )}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Administradores</p>
          </div>
        </div>
      </div>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Listado de miembros
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
              title="Refrescar listado"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
            </button>
          </div>
        </div>

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
            <Skeleton variant="table" />
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

      {/* ===================== MODALES EXTRAÍDOS ===================== */}

      <MiembroFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingMember={editingMember}
        formData={formData}
        setFormData={setFormData}
        emailError={emailError}
        checkEmailUniqueness={checkEmailUniqueness}
        isFormUnchanged={isFormUnchanged}
        isSubmitting={isSubmitting}
        isOnline={isOnline}
        onSubmit={handlePreSubmit}
      />

      <MiembroDetailModal
        detailModal={detailModal}
        setDetailModal={setDetailModal}
        isOnline={isOnline}
        globalConfig={globalConfig}
        onImageClick={(url) => setImageModal({ open: true, url })}
      />

      <TalentSearchModal
        isOpen={talentSearchModal.open}
        onClose={() => setTalentSearchModal({ open: false, queryProf: '', queryDesc: '', results: [] })}
        talentSearchModal={talentSearchModal}
        onSearch={handleSearchTalent}
        onViewProfile={(m) => {
          setTalentSearchModal({ open: false, queryProf: '', queryDesc: '', results: [] });
          handleOpenDetail(m);
        }}
      />

      {/* Modal de confirmación de acción (Crear/Editar) */}
      <Modal
        isOpen={confirmActionModal.open}
        onClose={() => setConfirmActionModal({ open: false })}
        id="confirm-action-modal"
        title={
          <div className="flex items-center gap-2.5 text-blue-600">
            <Info className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>Confirmar Acción</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span>
                ¿Estás seguro de que deseas <strong>{editingMember ? 'actualizar' : 'registrar'}</strong> a este miembro en el sistema?
                {editingMember ? (
                  ' Esta acción sobrescribirá la información anterior y registrará una notificación de sistema en la cuenta del miembro (sin envío de correo).'
                ) : (
                  <>
                    {' '}Esta acción creará un nuevo registro en la base de datos para{' '}
                    <strong>
                      {`${formData.nombre} ${formData.apellidoPaterno || ''} ${formData.apellidoMaterno || ''}`.trim()}
                    </strong>
                    , le enviará un correo de bienvenida con sus credenciales de acceso y{' '}
                    <strong className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block mt-2 text-xs">
                      ⚠️ Se le generará automáticamente una deuda de {formData.monto_inscripcion || 150} Bs. por motivo de inscripción.
                    </strong>
                  </>
                )}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setConfirmActionModal({ open: false })}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={executeSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" /> Procesando...
                </>
              ) : (
                'Sí, continuar'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <StatusConfirmModal
        isOpen={statusConfirmModal.open}
        onClose={() => setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo', reactivationMode: 'resume' })}
        statusConfirmModal={statusConfirmModal}
        setStatusConfirmModal={setStatusConfirmModal}
        onConfirm={executeToggleEstado}
        isSubmitting={isSubmitting}
      />

      {/* Modal para ver imagen en grande */}
      <Modal 
        isOpen={imageModal.open} 
        onClose={() => setImageModal({ open: false, url: null })} 
        title="Fotografía de Perfil"
        id="image-modal"
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
        id="result-modal"
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

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};
