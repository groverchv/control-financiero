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

/**
 * Traduce mensajes de error comunes de Supabase Auth al español.
 */
export const translateAuthError = (message) => {
  if (!message) return '';
  const lower = message.toLowerCase();
  
  if (lower.includes('new password should be different from the old password') || lower.includes('should be different')) {
    return 'La nueva contraseña debe ser diferente de la contraseña anterior.';
  }
  if (lower.includes('password should be at least 8 characters')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Credenciales de acceso incorrectas.';
  }
  if (lower.includes('email not confirmed')) {
    return 'La dirección de correo electrónico no ha sido confirmada.';
  }
  if (lower.includes('user not found')) {
    return 'El usuario no fue encontrado.';
  }
  if (lower.includes('token has expired') || lower.includes('token is expired') || lower.includes('expired')) {
    return 'El enlace o token ha expirado. Por favor, solicita uno nuevo.';
  }
  if (lower.includes('rate limit exceeded') || lower.includes('too many requests')) {
    return 'Has superado el límite de intentos. Por favor, inténtalo más tarde.';
  }
  if (lower.includes('refresh token')) {
    return 'Tu sesión de autenticación ha caducado. Por favor, inicia sesión de nuevo.';
  }
  
  return message;
};
