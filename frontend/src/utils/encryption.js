import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'control-financiero-default-secret-key-2026';

/**
 * Encripta una contraseña utilizando AES con la clave de entorno.
 * NOTA: Este cifrado se utiliza únicamente como capa adicional de ofuscación
 * para la columna `contrasena` en la base de datos. La autenticación real
 * la gestiona Supabase Auth con bcrypt.
 * 
 * @param {string} password - Contraseña en texto plano
 * @returns {string} Contraseña encriptada o cadena vacía si falla
 */
export const encryptPassword = (password) => {
  if (!password) return '';
  if (!SECRET_KEY) {
    console.error('[Security] No se puede encriptar: falta VITE_ENCRYPTION_KEY.');
    return '';
  }
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

/**
 * ELIMINADO: decryptPassword
 * 
 * Las contraseñas no deben ser reversibles por principio de seguridad.
 * Si se necesita restablecer una contraseña, utilice el endpoint
 * /api/admin/miembros/actualizar-password para generar una nueva.
 * 
 * La función anterior permitía descifrar contraseñas almacenadas,
 * lo cual violaba el pilar de Seguridad e Integridad (ISO/IEC 25010).
 */
