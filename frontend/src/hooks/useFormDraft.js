import { useEffect } from 'react';

/**
 * Hook para auto-guardar borradores de formularios en localStorage.
 * 
 * @param {string} key Llave de localStorage para identificar el formulario
 * @param {Object} formData Estado del formulario actual
 * @param {Function} setFormData Función para actualizar el estado del formulario
 */
export const useFormDraft = (key, formData, setFormData, enabled = true) => {
  // Carga inicial del borrador si existe
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Mezclamos con el estado inicial para evitar que falten propiedades
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error('[useFormDraft] Error cargando borrador:', e);
    }
  }, [key, enabled]); // Solamente al montar o cambiar enabled

  // Actualizar el localStorage cada vez que cambien los datos del formulario
  useEffect(() => {
    if (!enabled || !formData) return;
    try {
      // No guardamos contraseñas por seguridad
      const dataToSave = { ...formData };
      if (dataToSave.password !== undefined) dataToSave.password = '';
      if (dataToSave.confirmPassword !== undefined) dataToSave.confirmPassword = '';
      
      localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('[useFormDraft] Error guardando borrador:', e);
    }
  }, [key, formData, enabled]);

  // Función para borrar el borrador una vez enviado el formulario
  const clearDraft = () => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('[useFormDraft] Error eliminando borrador:', e);
    }
  };

  return { clearDraft };
};
