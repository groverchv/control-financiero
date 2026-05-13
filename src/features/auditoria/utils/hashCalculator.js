/**
 * Utilidad de calculo de hashes SHA-256 en el navegador.
 * Usa la Web Crypto API nativa, sin dependencias externas.
 */

/**
 * Calcula el SHA-256 de un string arbitrario.
 * @param {string} texto
 * @returns {Promise<string>} Hash hexadecimal de 64 caracteres
 */
export async function calcularSHA256(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Genera el hash para un registro de ingreso.
 * Replica la misma logica del trigger de PostgreSQL.
 */
export async function hashIngreso(registro) {
    const cadena = `${registro.id}${registro.monto}${registro.fecha}${registro.hash_anterior || 'genesis'}`;
    return calcularSHA256(cadena);
}

/**
 * Genera el hash para un registro de egreso.
 */
export async function hashEgreso(registro) {
    const cadena = `${registro.id}${registro.monto}${registro.fecha}${registro.hash_anterior || 'genesis'}`;
    return calcularSHA256(cadena);
}

/**
 * Genera el hash para un registro de activo.
 */
export async function hashActivo(registro) {
    const fechaAdq = registro.fechaAdquisicion || '';
    const cadena = `${registro.id}${registro.costo_total}${fechaAdq}${registro.hash_anterior || 'genesis'}`;
    return calcularSHA256(cadena);
}

/**
 * Genera el hash para un registro de archivo (comprobante).
 */
export async function hashArchivo(registro) {
    const fk = registro.egreso_id || registro.ingreso_id || registro.activo_id
        || registro.actividad_id || registro.miembro_id || 'sin_referencia';
    const cadena = `${registro.id}${registro.url}${fk}${registro.hash_anterior || 'genesis'}`;
    return calcularSHA256(cadena);
}

/**
 * Selecciona automaticamente la funcion de hash correcta segun el tipo de tabla.
 */
export async function calcularHashRegistro(tipoTabla, registro) {
    switch (tipoTabla) {
        case 'ingreso': return hashIngreso(registro);
        case 'egreso': return hashEgreso(registro);
        case 'activo': return hashActivo(registro);
        case 'archivo': return hashArchivo(registro);
        default: throw new Error(`Tipo de tabla no soportado: ${tipoTabla}`);
    }
}
