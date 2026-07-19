import { toast } from 'react-toastify';

/**
 * Utilidad para centralizar el manejo de errores.
 * Previene que los stack traces o detalles técnicos (ej. violaciones de RLS de Supabase)
 * se filtren al usuario final, mostrando un mensaje genérico.
 */
export const handleError = (error, customMessage = 'Ocurrió un error inesperado') => {
  // 1. Loggear el error real a la consola (idealmente se enviaría a Sentry/Datadog)
  console.error('[Error Centralizado]:', error);

  // 2. Extraer el mensaje para la UI (Sanitizado)
  let uiMessage = customMessage;

  if (error?.message) {
    // Si el error es una violación de RLS, dar un mensaje claro sin revelar el schema
    if (error.message.includes('row-level security') || error.message.includes('RLS')) {
      uiMessage = 'No tienes permisos suficientes para realizar esta acción.';
    } else if (error.message.includes('Failed to fetch')) {
      uiMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
    }
    // NOTA: No exponemos error.message directamente si no estamos seguros de que sea seguro
  }

  // 3. Mostrar Toast
  toast.error(uiMessage, {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};
