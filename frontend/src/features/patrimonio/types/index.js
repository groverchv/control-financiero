/** @typedef {{ id: string, nombre: string, descripcion: string, valorInicial: number, valorActual: number, fechaAdquisicion: string, categoria: string }} Activo */
/** @typedef {{ id: string, activoId: string, cuota: number, cuotasTotal: number, valorActualizado: number }} PlanAmortizacion */
/** @typedef {{ id: string, activoId: string, proveedor: string, fecha: string, costo: number, estado: 'registrado'|'aprobado' }} AdquisicionActivo */
/** @typedef {{ id: string, activoId: string, hash: string, fecha: string, estado: 'pendiente'|'sellado' }} AuditoriaBlockchain */

export const types = {};
