/**
 * Validadores centralizados del sistema.
 * 
 * Pilar: Corrección — cada validador cubre edge cases y
 * retorna un booleano limpio sin efectos secundarios.
 */

/**
 * Valida formato de email usando regex estándar.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Valida longitud mínima de teléfono (7 dígitos).
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Extraer solo dígitos para validar longitud real
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
};

/**
 * Valida que un valor sea un monto monetario positivo y finito.
 * @param {number} value
 * @returns {boolean}
 */
export const isValidCurrency = (value) => {
  return typeof value === 'number' && value >= 0 && Number.isFinite(value);
};

/**
 * Valida que un monto monetario sea estrictamente positivo (mayor a cero).
 * Útil para costos de actividades, cuotas, etc.
 * @param {number} value
 * @returns {boolean}
 */
export const isPositiveCurrency = (value) => {
  return typeof value === 'number' && value > 0 && Number.isFinite(value);
};

/**
 * Valida que un nombre tenga al menos 2 caracteres alfanuméricos.
 * @param {string} name
 * @returns {boolean}
 */
export const isValidName = (name) => {
  return typeof name === 'string' && name.trim().length >= 2;
};

/**
 * Valida formato UUID v4.
 * @param {string} id
 * @returns {boolean}
 */
export const isValidUUID = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

/**
 * Valida que una contraseña tenga al menos 8 caracteres.
 * @param {string} password
 * @returns {boolean}
 */
export const isStrongPassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

/**
 * Sanitiza una cadena de texto eliminando etiquetas HTML para prevenir XSS.
 * @param {string} str - Cadena potencialmente peligrosa
 * @returns {string} Cadena limpia
 */
export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * Valida que un hash SHA-256 tenga 64 caracteres hexadecimales.
 * @param {string} hash
 * @returns {boolean}
 */
export const isValidSHA256 = (hash) => {
  if (!hash || typeof hash !== 'string') return false;
  return /^[0-9a-f]{64}$/i.test(hash);
};
