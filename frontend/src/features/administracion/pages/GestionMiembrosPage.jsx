import { useState, useEffect } from 'react';
import { Edit, Eye, EyeOff, Info, Plus, Search, Lightbulb, ChevronLeft, ChevronRight, UserX, UserCheck, AlertTriangle, CheckCircle2, UserCircle, FileText, Upload, RefreshCw } from 'lucide-react';
import { useMiembros } from '../hooks';
import { useFormDraft } from '../../../hooks/useFormDraft';
import { HighlightMatch } from '../../../utils/textHighlight';
import { Button, Input, Spinner, Modal, ExportButtons, Skeleton, Confetti } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { administracionApi } from '../api';
import { finanzasApi } from '../../finanzas/api';
import { supabase } from '../../../services/supabase';

const ITEMS_PER_PAGE = 10;

const ModalPagination = ({ current, total, onPageChange, filteredCount, label = 'registros' }) => {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 mt-3">
      <p className="text-[10px] text-slate-500">
        Mostrando <span className="font-semibold text-slate-900">{((current - 1) * ITEMS_PER_PAGE) + 1}</span> a{' '}
        <span className="font-semibold text-slate-900">{Math.min(current * ITEMS_PER_PAGE, filteredCount)}</span> de{' '}
        <span className="font-semibold text-slate-900">{filteredCount}</span> {label}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
          {current} / {total}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(total, current + 1))}
          disabled={current === total}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDetailPassword, setShowDetailPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    apellidoPaterno: '', 
    apellidoMaterno: '', 
    email: '', 
    telefono: '', 
    password: '', 
    confirmPassword: '',
    rol: 'socio', 
    estado: 'activo',
    monto_inscripcion: 150
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [emailError, setEmailError] = useState('');

  const checkEmailUniqueness = (emailVal) => {
    if (!emailVal) {
      setEmailError('');
      return;
    }
    const cleanEmail = emailVal.trim().toLowerCase();
    
    // Si estamos editando y el email es el mismo que el original, no hay error
    if (editingMember && cleanEmail === editingMember.email.toLowerCase()) {
      setEmailError('');
      return;
    }
    
    const exists = miembros.some(m => m.email.toLowerCase() === cleanEmail);
    if (exists) {
      setEmailError('Este correo electrónico ya está registrado por otro miembro.');
    } else {
      setEmailError('');
    }
  };

  // Auto-guardado de borrador (deshabilitado cuando estamos editando un miembro existente)
  const { clearDraft } = useFormDraft('miembro_form_draft', formData, setFormData, !editingMember);

  const [detailModal, setDetailModal] = useState({ 
    open: false, 
    miembro: null, 
    inscripciones: [], 
    notificaciones: [], 
    cvUrl: null, 
    loading: false, 
    tab: 'inscripciones',
    cronograma: [],
    inscripcionesCuenta: []
  });
  const [pageDetailCuotas, setPageDetailCuotas] = useState(1);
  const [pageDetailActs, setPageDetailActs] = useState(1);
  const [talentSearchModal, setTalentSearchModal] = useState({ open: false, queryProf: '', queryDesc: '', results: [] });
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [statusConfirmModal, setStatusConfirmModal] = useState({ open: false, miembro: null, nuevoEstado: 'activo', reactivationMode: 'resume' });
  const [confirmActionModal, setConfirmActionModal] = useState({ open: false });
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  const [loadingModal, setLoadingModal] = useState({ open: false, text: '' });

  const isFormUnchanged = !!editingMember && 
    formData.nombre === editingMember.nombre &&
    (formData.apellidoPaterno || '') === (editingMember.apellidoPaterno || '') &&
    (formData.apellidoMaterno || '') === (editingMember.apellidoMaterno || '') &&
    formData.email === editingMember.email &&
    (formData.telefono || '') === (editingMember.telefono || '') &&
    formData.password === '' &&
    formData.confirmPassword === '' &&
    formData.rol === editingMember.rol &&
    formData.estado === editingMember.estado &&
    Number(formData.monto_inscripcion || 150) === Number(editingMember.monto_inscripcion || 150);

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
      estado: 'activo',
      monto_inscripcion: 150
    });
    setShowPassword(false);
    setEmailError('');
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
      estado: miembro.estado,
      monto_inscripcion: miembro.monto_inscripcion || 150
    });
    setEmailError('');
    setIsModalOpen(true);
  };

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
      // Fusionar respuesta del servidor con los datos existentes del miembro
      // (La respuesta offline puede tener datos parciales)
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

  const handleOpenDetail = async (miembro) => {
    setShowDetailPassword(false);
    setPageDetailCuotas(1);
    setPageDetailActs(1);
    setDetailModal({ 
      open: true, 
      miembro, 
      inscripciones: [], 
      notificaciones: [], 
      cvUrl: null, 
      loading: true, 
      tab: 'inscripciones',
      cronograma: [],
      inscripcionesCuenta: []
    });
    try {
      const [inscripciones, notificaciones, cvUrl, historialCuotas, { data: inscripcionesCuenta }] = await Promise.all([
        administracionApi.obtenerInscripcionesMiembro(miembro.id),
        administracionApi.obtenerNotificacionesMiembro(miembro.id),
        administracionApi.obtenerDocumentoMiembro(miembro.id),
        finanzasApi.obtenerHistorialCuotasMiembro(),
        supabase
          .from('inscripcion')
          .select(`
            id,
            estado,
            fecha_inscripcion,
            actividad:actividad_id(
              id, titulo, costo, fecha, hora, modalidad,
              tipo_actividad:tipo_actividad_id(nombre)
            )
          `)
          .eq('miembro_id', miembro.id)
          .order('fecha_inscripcion', { ascending: false })
      ]);

      const miRegistroCuotas = historialCuotas.find(h => h.miembro?.id === miembro.id);
      const cronograma = miRegistroCuotas ? miRegistroCuotas.cronograma : [];

      setDetailModal(prev => ({ 
        ...prev, 
        inscripciones, 
        notificaciones, 
        cvUrl, 
        cronograma,
        inscripcionesCuenta: inscripcionesCuenta || [],
        loading: false 
      }));
    } catch (err) {
      console.error('Error cargando detalle:', err);
      setDetailModal(prev => ({ ...prev, loading: false }));
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

    if (!editingMember) {
      if (formData.password !== formData.confirmPassword) {
        setResultModal({
          open: true,
          type: 'error',
          text: 'Error de validación',
          details: 'Las contraseñas ingresadas no coinciden. Por favor, verifíquelas.'
        });
        return;
      }
      if (formData.password.length < 4) {
        setResultModal({
          open: true,
          type: 'error',
          text: 'Contraseña insegura',
          details: 'La contraseña debe tener al menos 4 caracteres por seguridad.'
        });
        return;
      }
    }

    if (editingMember && formData.password) {
      if (formData.password !== formData.confirmPassword) {
        setResultModal({
          open: true,
          type: 'error',
          text: 'Error de validación',
          details: 'Las contraseñas ingresadas no coinciden. Por favor, verifíquelas.'
        });
        return;
      }
      if (formData.password.length < 4) {
        setResultModal({
          open: true,
          type: 'error',
          text: 'Contraseña insegura',
          details: 'La contraseña debe tener al menos 4 caracteres por seguridad.'
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
        // Fusionar respuesta del servidor con los datos existentes del miembro para no perder campos
        // (La respuesta offline puede tener datos parciales)
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
        miembro.rol === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
        miembro.rol === 'secretario' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
        'bg-slate-50 text-slate-700 border-slate-100'
      }`}>
        <HighlightMatch text={miembro.rol} query={searchTerm} />
      </span>
    ),
    estado: (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
        miembro.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}>
        <HighlightMatch text={miembro.estado} query={searchTerm} />
      </span>
    ),
    acciones: (
      <div className="flex gap-2">
        <button 
          onClick={() => handleOpenDetail(miembro)}
          className="rounded p-1 text-blue-600 hover:bg-blue-50 transition-colors"
          title="Ver detalle"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleOpenEdit(miembro)}
          className="rounded p-1 text-amber-600 hover:bg-amber-50 transition-colors"
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

  // --- Formatters and variables for Member Detail Account Statement ---
  const formatCurrency = (val) => `Bs ${Number(val || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const totalPagesDetailCuotas = Math.ceil((detailModal.cronograma || []).length / ITEMS_PER_PAGE);
  const paginatedDetailCuotas = (detailModal.cronograma || []).slice((pageDetailCuotas - 1) * ITEMS_PER_PAGE, pageDetailCuotas * ITEMS_PER_PAGE);

  const filteredDetailActs = (detailModal.inscripcionesCuenta || []).filter(i => i.actividad && Number(i.actividad.costo) > 0);
  const totalPagesDetailActs = Math.ceil(filteredDetailActs.length / ITEMS_PER_PAGE);
  const paginatedDetailActs = filteredDetailActs.slice((pageDetailActs - 1) * ITEMS_PER_PAGE, pageDetailActs * ITEMS_PER_PAGE);

  const cuotasColumns = [
    { key: 'periodo', label: 'Periodo' },
    { key: 'fecha_generacion', label: 'Generación' },
    { key: 'monto_display', label: 'Monto' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const cuotasRows = paginatedDetailCuotas.map((c, idx) => ({
    id: c.mes + '-' + idx,
    periodo: <span className="font-semibold text-slate-800 text-xs">{c.mes}</span>,
    fecha_generacion: <span className="text-xs text-slate-600">{formatDate(c.fechaGeneracion)}</span>,
    monto_display: (
      <span className={`font-bold text-xs ${c.pagado ? 'text-emerald-600' : 'text-red-600'}`}>
        {c.pagado ? formatCurrency(c.monto_pagado || c.monto_esperado) : formatCurrency(c.monto_esperado)}
      </span>
    ),
    estado_display: c.pagado ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <CheckCircle2 className="h-2.5 w-2.5" /> PAGADA
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
        <AlertTriangle className="h-2.5 w-2.5" /> PENDIENTE
      </span>
    ),
  }));

  const actsColumns = [
    { key: 'actividad', label: 'Actividad' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'costo_display', label: 'Costo' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const actsRows = paginatedDetailActs.map((ins, idx) => ({
    id: ins.id || idx,
    actividad: (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800 text-xs">{ins.actividad?.titulo || 'Sin nombre'}</span>
        <span className="text-[9px] text-slate-400">
          {ins.actividad?.fecha ? new Date(ins.actividad.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
        </span>
      </div>
    ),
    tipo: (
      <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 uppercase">
        {ins.actividad?.tipo_actividad?.nombre || 'General'}
      </span>
    ),
    costo_display: (
      <span className="font-bold text-xs text-slate-800">
        {formatCurrency(ins.actividad?.costo || 0)}
      </span>
    ),
    estado_display: ins.estado === 'pagado' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <CheckCircle2 className="h-2.5 w-2.5" /> PAGADO
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        <AlertTriangle className="h-2.5 w-2.5" /> PENDIENTE
      </span>
    ),
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
            variant="outline" 
            type="button" 
            onClick={() => setTalentSearchModal({ open: true, queryProf: '', queryDesc: '', results: [] })}
            className="flex-1 sm:flex-none whitespace-nowrap h-9 flex items-center justify-center gap-2 px-3"
          >
            <Lightbulb className="h-4 w-4 shrink-0 text-yellow-500" />
            <span className="hidden sm:inline text-sm">Buscador de Talentos</span>
            <span className="sm:hidden text-xs">Talentos</span>
          </Button>
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMember ? 'Editar miembro' : 'Registrar nuevo miembro'}
      >
        <form onSubmit={handlePreSubmit} className="space-y-4">
          {/* Sección de Datos Personales */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Datos Personales</h3>
            
            <Input 
              label="Nombres" 
              placeholder="Ej: Juan Antonio"
              value={formData.nombre} 
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
              required 
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Apellido Paterno" 
                placeholder="Ej: Pérez"
                value={formData.apellidoPaterno || ''} 
                onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })} 
              />
              <Input 
                label="Apellido Materno" 
                placeholder="Ej: Flores"
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
                placeholder="Ej: juan.perez@correo.com"
                value={formData.email} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, email: val });
                  checkEmailUniqueness(val);
                }} 
                error={emailError}
                required 
              />
              <Input 
                label="Teléfono" 
                placeholder="Ej: 71234567"
                value={formData.telefono} 
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
              />
            </div>
          </div>
          
          {/* Sección de Credenciales */}
          {(() => {
            const passwordsMismatch = (formData.password || formData.confirmPassword) && formData.password !== formData.confirmPassword;
            return (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {editingMember ? 'Actualizar Credenciales (Dejar en blanco para mantener la actual)' : 'Credenciales de Acceso'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Input 
                      label="Contraseña" 
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      required={!editingMember} 
                      placeholder={editingMember ? 'Dejar en blanco para mantener la actual' : 'Mínimo 4 caracteres'}
                      autoComplete="new-password"
                      error={passwordsMismatch ? ' ' : ''}
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
                    required={!editingMember}
                    placeholder={editingMember ? 'Dejar en blanco para mantener la actual' : 'Mínimo 4 caracteres'}
                    autoComplete="new-password"
                    error={passwordsMismatch ? 'Las contraseñas no coinciden' : ''}
                  />
                </div>
              </div>
            );
          })()}

          {/* Sección de Configuración Administrativa */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold text-slate-500">Configuración del Sistema</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Monto Inscripción (Bs.)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 150"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                  value={formData.monto_inscripcion}
                  onChange={(e) => setFormData({ ...formData, monto_inscripcion: e.target.value })}
                  disabled={!!editingMember}
                />
                {!!editingMember && (
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">No editable post-registro</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isFormUnchanged}
              className={`${isFormUnchanged ? "opacity-50 cursor-not-allowed" : ""} ${!isOnline ? "bg-amber-500 hover:bg-amber-600 border-amber-600 text-white" : ""}`}
            >
              {isSubmitting ? 'Guardando...' : !isOnline ? '💾 Guardar localmente (Offline)' : editingMember ? 'Actualizar' : 'Guardar Miembro'}
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
          {/* Cabecera y Detalles unificados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-100/80">
            {/* Foto de Perfil y Nombre */}
            <div className="flex flex-col items-center text-center space-y-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm md:col-span-1 justify-center">
              <div 
                className="h-28 w-28 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-inner group relative cursor-pointer"
                onClick={() => detailModal.miembro?.foto && setImageModal({ open: true, url: detailModal.miembro.foto })}
                title="Haga clic para ver foto completa"
              >
                {detailModal.miembro?.foto ? (
                  <img 
                    src={detailModal.miembro.foto} 
                    alt="Perfil" 
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" 
                  />
                ) : (
                  <UserCircle className="h-16 w-16 text-slate-300" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base leading-tight">
                  {detailModal.miembro?.nombre}
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {detailModal.miembro?.apellidoPaterno} {detailModal.miembro?.apellidoMaterno}
                </p>
                <span className="inline-block mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100">
                  {detailModal.miembro?.rol}
                </span>
              </div>
            </div>

            {/* Datos Personales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2 text-sm">
              <div>
                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Correo Electrónico</span> 
                <span className="text-slate-800 font-medium break-all">{detailModal.miembro?.email}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Teléfono</span> 
                <span className="text-slate-800 font-medium">{detailModal.miembro?.telefono || '-'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Estado</span> 
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase mt-0.5 ${detailModal.miembro?.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>{detailModal.miembro?.estado}</span>
              </div>
              
              <div className="sm:col-span-2 border-t border-slate-200/60 pt-3">
                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Profesión / Título</span>
                <span className="text-slate-800 font-medium">{detailModal.miembro?.profesion || '-'}</span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-200/60 pt-3">
                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Biografía / Habilidades</span>
                <span className="text-slate-800 font-medium leading-relaxed">{detailModal.miembro?.biografia || '-'}</span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-200/60 pt-3 flex items-center gap-2">
                <span className="font-semibold text-slate-500">Contraseña:</span>
                <span className="font-mono text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                  {showDetailPassword ? detailModal.miembro?.contrasena || 'No registrada' : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetailPassword(!showDetailPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  title={showDetailPassword ? 'Ocultar Contraseña' : 'Ver Contraseña'}
                >
                  {showDetailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
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
              onClick={() => setDetailModal(prev => ({ ...prev, tab: 'estado_cuenta' }))}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                detailModal.tab === 'estado_cuenta' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Estado de Cuenta
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
                    <span className="text-[10px] text-slate-400">{notif.creacion ? new Date(notif.creacion).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{notif.descripcion}</p>
                </div>
              ))}
            </div>
          ) : detailModal.tab === 'cv' ? (
            <div className="space-y-4">
              {detailModal.cvUrl ? (
                <div className="flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">CV CARGADO ✓</span>
                    <a href={detailModal.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1">
                      Abrir en nueva pestaña
                    </a>
                  </div>
                  {!isOnline ? (
                    <div className="w-full flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-200/60 text-center space-y-3">
                      <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Previsualización No Disponible Sin Conexión</h4>
                      <p className="text-[10px] text-slate-500 max-w-sm">
                        La previsualización interactiva de documentos requiere conexión a internet. Puede descargar el archivo si lo necesita sin conexión.
                      </p>
                      <a 
                        href={detailModal.cvUrl?.replace('/upload/', '/upload/fl_attachment/')} 
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-md"
                      >
                        Descargar Documento
                      </a>
                    </div>
                  ) : (
                    <iframe 
                      src={detailModal.cvUrl?.toLowerCase().endsWith('.pdf') 
                        ? detailModal.cvUrl 
                        : `https://docs.google.com/gview?url=${encodeURIComponent(detailModal.cvUrl)}&embedded=true`
                      } 
                      className="w-full h-80 border rounded-xl bg-slate-50 shadow-inner" 
                      title="CV del Miembro"
                    ></iframe>
                  )}
                  
                  {/* Permitir actualizar desde el detalle */}
                  <div className="w-full mt-4 p-4 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Actualizar documento CV</p>
                      <p className="text-[10px] text-slate-400">PDF, DOC o DOCX · Máx 10MB</p>
                    </div>
                    <label className="bg-white border border-slate-200 text-xs px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-slate-50 hover:border-slate-300 font-bold cursor-pointer transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Reemplazar CV
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.doc,.docx" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            alert("El archivo excede el límite de 10MB.");
                            return;
                          }
                          try {
                            setDetailModal(prev => ({ ...prev, loading: true }));
                            await administracionApi.subirArchivo(detailModal.miembro.id, file, 'cv');
                            const cvUrl = await administracionApi.obtenerDocumentoMiembro(detailModal.miembro.id);
                            setDetailModal(prev => ({ ...prev, cvUrl, loading: false }));
                          } catch (err) {
                            alert("Error al subir CV: " + err.message);
                            setDetailModal(prev => ({ ...prev, loading: false }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm font-semibold mb-1">Este profesional aún no tiene cargado su Currículum Vitae.</p>
                  <p className="text-xs text-slate-400 mb-4">Puedes adjuntar su documento CV en formato PDF o Word.</p>
                  
                  <label className="inline-flex bg-blue-600 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 font-bold cursor-pointer transition-all active:scale-95 items-center gap-1.5">
                    <Upload className="w-4 h-4" />
                    Subir Documento CV
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          alert("El archivo excede el límite de 10MB.");
                          return;
                        }
                        try {
                          setDetailModal(prev => ({ ...prev, loading: true }));
                          await administracionApi.subirArchivo(detailModal.miembro.id, file, 'cv');
                          const cvUrl = await administracionApi.obtenerDocumentoMiembro(detailModal.miembro.id);
                          setDetailModal(prev => ({ ...prev, cvUrl, loading: false }));
                        } catch (err) {
                          alert("Error al subir CV: " + err.message);
                          setDetailModal(prev => ({ ...prev, loading: false }));
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          ) : detailModal.tab === 'estado_cuenta' ? (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Monto Inscripción</span>
                  <span className="text-lg font-black text-slate-700">{formatCurrency(detailModal.miembro?.monto_inscripcion || 150)}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cuota Mensual</span>
                  <span className="text-lg font-black text-slate-700">{formatCurrency(globalConfig.monto_cuota || 20)}</span>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Deuda Acumulada</span>
                  <span className="text-lg font-black text-amber-700">
                    {formatCurrency(
                      detailModal.cronograma.filter(c => !c.pagado).reduce((sum, c) => sum + Number(c.monto_esperado || 0), 0) +
                      detailModal.inscripcionesCuenta.filter(i => i.estado !== 'pagado').reduce((sum, i) => sum + Number(i.actividad?.costo || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Seccion Cuotas */}
              <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Cuotas</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{detailModal.cronograma.length} registros</span>
                </div>
                <Table columns={cuotasColumns} rows={cuotasRows} emptyMessage="No hay cuotas registradas." />
                <ModalPagination
                  current={pageDetailCuotas}
                  total={totalPagesDetailCuotas}
                  onPageChange={setPageDetailCuotas}
                  filteredCount={detailModal.cronograma.length}
                  label="cuotas"
                />
              </div>

              {/* Seccion Actividades */}
              <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Actividades</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{filteredDetailActs.length} registros</span>
                </div>
                <Table columns={actsColumns} rows={actsRows} emptyMessage="No hay actividades registradas." />
                <ModalPagination
                  current={pageDetailActs}
                  total={totalPagesDetailActs}
                  onPageChange={setPageDetailActs}
                  filteredCount={filteredDetailActs.length}
                  label="inscripciones"
                />
              </div>
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

      {/* Modal premium de confirmación de acción (Crear/Editar) */}
      <Modal
        isOpen={confirmActionModal.open}
        onClose={() => setConfirmActionModal({ open: false })}
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

      {/* Modal premium de confirmación de cambio de estado */}
      <Modal
        isOpen={statusConfirmModal.open}
        onClose={() => setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo', reactivationMode: 'resume' })}
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
          {statusConfirmModal.nuevoEstado === 'inactivo' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 bg-red-50/50 border border-red-100 rounded-xl text-red-800 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">¡Advertencia Importante!</p>
                  <p className="leading-relaxed">
                    ¿Estás seguro de cambiar el estado del miembro <strong>{statusConfirmModal.miembro?.nombre}</strong> a <strong>Inactivo</strong>?
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Efectos en el sistema:</p>
                <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                  <li><strong>Acceso bloqueado:</strong> El miembro no podrá iniciar sesión en la plataforma.</li>
                  <li><strong>Notificaciones pausadas:</strong> Se detendrá el envío de notificaciones y alertas automáticas.</li>
                  <li><strong>Generación de cuotas congelada:</strong> El contador de tiempo para su próxima cuota se detendrá inmediatamente. No se generarán nuevas cuotas mientras esté inactivo.</li>
                  <li><strong>Deudas pendientes:</strong> Las cuotas que ya están pendientes de pago <strong className="text-slate-800">NO se eliminarán ni se marcarán como pagadas</strong>, y seguirán registradas en su cuenta.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="leading-relaxed">
                    Confirmar reactivación para el miembro <strong>{statusConfirmModal.miembro?.nombre}</strong>. Se habilitará nuevamente su acceso a la plataforma.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200/80 rounded-xl p-4 bg-white space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Configuración del Ciclo de Cuotas
                </label>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Selecciona cómo deseas que el sistema gestione la generación de la próxima cuota de membresía:
                </p>
                
                <div className="space-y-2 pt-1">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${statusConfirmModal.reactivationMode === 'resume' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      name="reactivationMode" 
                      value="resume"
                      checked={statusConfirmModal.reactivationMode === 'resume'}
                      onChange={() => setStatusConfirmModal(prev => ({ ...prev, reactivationMode: 'resume' }))}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Reanudar desde donde se pausó</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Continúa el conteo del ciclo actual. Se sumará el tiempo restante que el usuario tenía acumulado antes de ser inactivado.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${statusConfirmModal.reactivationMode === 'reset' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      name="reactivationMode" 
                      value="reset"
                      checked={statusConfirmModal.reactivationMode === 'reset'}
                      onChange={() => setStatusConfirmModal(prev => ({ ...prev, reactivationMode: 'reset' }))}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Iniciar un nuevo ciclo completo desde cero</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Reinicia el contador de cuotas. El conteo comenzará desde cero a partir de hoy, otorgando un ciclo completo nuevo.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo', reactivationMode: 'resume' })}
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

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};
