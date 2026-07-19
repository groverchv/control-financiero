/**
 * Utilidad de sanitización para prevenir XSS.
 * Remueve etiquetas HTML y caracteres peligrosos de las cadenas de texto.
 */

export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitiza recursivamente un objeto (útil para payloads completos)
 */
export const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item));
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Excluir sanitización de passwords para no alterar su valor real antes de encriptar (si aplica)
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('contrasena')) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  return obj;
};
