import { useState } from 'react';
import { Edit, Eye, EyeOff, Info, Plus, Search, Lightbulb, ChevronLeft, ChevronRight, UserX, UserCheck, AlertTriangle, CheckCircle2, UserCircle, FileText, Upload } from 'lucide-react';
import { useMiembros } from '../hooks';
import { Button, Input, Spinner, Modal, ExportButtons } from '../../../components/ui';
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
  const { miembros, loading, error, setMiembros } = useMiembros();
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
    estado: 'activo' 
  });
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
  const [statusConfirmModal, setStatusConfirmModal] = useState({ open: false, miembro: null, nuevoEstado: 'activo' });
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
    formData.estado === editingMember.estado;

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

    setStatusConfirmModal({ open: false, miembro: null, nuevoEstado: 'activo' });
    setIsSubmitting(true);
    setLoadingModal({
      open: true,
      text: nuevoEstado === 'activo' ? 'Reactivando miembro...' : 'Desactivando miembro...'
    });
    try {
      const actualizado = await administracionApi.actualizarMiembro(miembro.id, { estado: nuevoEstado });
      setMiembros(miembros.map(m => m.id === miembro.id ? actualizado : m));
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'success',
        text: nuevoEstado === 'activo' ? '¡Miembro Reactivado!' : '¡Miembro Desactivado!',
        details: `El estado del miembro ${miembro.nombre} ha sido actualizado a ${nuevoEstado} con éxito en la base de datos.`
      });
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
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




  const handleSearchTalent = (queryProf, queryDesc) => {
    if (!queryProf.trim() && !queryDesc.trim()) {
      setTalentSearchModal(prev => ({ ...prev, queryProf, queryDesc, results: [] }));
      return;
    }
    
    const normalize = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    
    const termsProf = normalize(queryProf).split(/\s+/).filter(t => t.length > 0);
    const termsDesc = normalize(queryDesc).split(/\s+/).filter(t => t.length > 0);
    
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
      
    setTalentSearchModal(prev => ({ ...prev, queryProf, queryDesc, results: scored }));
  };


  const handlePreSubmit = (e) => {
    e.preventDefault();

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
        const miembroSincronizado = {
          ...actualizado,
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

        let descNotif = 'Tus datos personales o configuraciones de cuenta han sido actualizados por la administración.';
        if (changedFields.length > 0) {
          descNotif = `Los siguientes campos han sido actualizados por la administración: ${changedFields.join(', ')}.`;
        }
        if (password) {
          descNotif += ' Además, tu contraseña de acceso ha sido modificada.';
        }

        // Crear notificación del sistema (no por correo)
        await supabase.from('notificacion').insert([{
          miembro_id: editingMember.id,
          titulo: password ? 'Credenciales de Acceso Actualizadas' : 'Actualización de Perfil',
          descripcion: descNotif,
          estado: 'pendiente'
        }]);

        setLoadingModal({ open: false, text: '' });
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Miembro actualizado con éxito!',
          details: password 
            ? 'Los datos y la contraseña del socio se han actualizado correctamente en Supabase, y se ha registrado una notificación de sistema.'
            : 'Los datos personales y de configuración del socio se han actualizado correctamente y se ha registrado una notificación de sistema.'
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
            onClick={() => setTalentSearchModal({ open: true, query: '', results: [] })}
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
        <form onSubmit={handlePreSubmit} className="space-y-4">
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
              />
              <Input 
                label="Teléfono" 
                value={formData.telefono} 
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
              />
            </div>
          </div>
          
          {/* Sección de Credenciales */}
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
              />
            </div>
          </div>

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
            <Button 
              type="submit" 
              disabled={isSubmitting || isFormUnchanged}
              className={isFormUnchanged ? "opacity-50 cursor-not-allowed" : ""}
            >
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
                  <iframe 
                    src={detailModal.cvUrl?.toLowerCase().endsWith('.pdf') 
                      ? detailModal.cvUrl 
                      : `https://docs.google.com/gview?url=${encodeURIComponent(detailModal.cvUrl)}&embedded=true`
                    } 
                    className="w-full h-80 border rounded-xl bg-slate-50 shadow-inner" 
                    title="CV del Miembro"
                  ></iframe>
                  
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
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Monto Cuota Base</span>
                  <span className="text-lg font-black text-slate-700">{formatCurrency(detailModal.cronograma?.[0]?.monto_esperado || 150)}</span>
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
                Esta acción {editingMember 
                  ? 'sobrescribirá la información anterior y registrará una notificación de sistema en la cuenta del miembro (sin envío de correo).' 
                  : 'creará un nuevo registro en la base de datos y le enviará un correo de bienvenida con sus credenciales de acceso.'}
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

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
    </div>
  );
};
