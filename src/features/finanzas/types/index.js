/** @typedef {{ id: string, miembroId: string, monto: number, moneda: 'BS'|'USD', fecha: string, estado: 'pagada'|'pendiente'|'vencida' }} Cuota */
/** @typedef {{ id: string, tipo: 'ingreso'|'egreso', monto: number, descripcion: string, fecha: string }} Transaccion */
/** @typedef {{ ingresosTotales: number, egresosTotales: number, saldoNeto: number }} FlujoCaja */
/** @typedef {{ id: string, concepto: string, monto: number, fecha: string, metodo: string }} IngresoExtra */
/** @typedef {{ id: string, concepto: string, monto: number, fecha: string, categoria: string }} EgresoOperativo */
/** @typedef {{ id: string, periodo: string, totalIngresos: number, totalEgresos: number, saldo: number }} ReporteFinanciero */

export const types = {};
