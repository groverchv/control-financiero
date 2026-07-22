import { useState, useCallback } from 'react';

const INITIAL_FORM_DATA = { 
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
};

/**
 * Hook para gestionar el estado del formulario de creación/edición de miembros.
 * Centraliza toda la lógica de formData, validación de email, detección de cambios y borrador.
 * 
 * Pilar: Mantenibilidad — extraído de GestionMiembrosPage (400+ líneas de lógica de form).
 */
export const useMiembroForm = (miembros) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [emailError, setEmailError] = useState('');

  const clearDraft = () => {};

  const checkEmailUniqueness = useCallback((emailVal) => {
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
  }, [editingMember, miembros]);

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

  const handleOpenCreate = useCallback(() => {
    setEditingMember(null);
    setFormData(INITIAL_FORM_DATA);
    setEmailError('');
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((miembro) => {
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
  }, []);

  return {
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
  };
};
