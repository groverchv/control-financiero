export const ROLES = {
  ADMIN: 'admin',
  SECRETARIO: 'secretario',
  SOCIO: 'socio',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.SECRETARIO]: 'Secretario',
  [ROLES.SOCIO]: 'Socio',
};

export const PERMISSIONS = {
  [ROLES.ADMIN]: ['ver_miembros', 'crear_miembro', 'editar_miembro', 'eliminar_miembro', 'dashboard_kpis', 'portal_socio'],
  [ROLES.SECRETARIO]: ['ver_miembros', 'crear_miembro', 'editar_miembro'],
  [ROLES.SOCIO]: ['portal_socio', 'ver_perfil'],
};

/**
 * Estados válidos de entidades del sistema.
 * Estándar: Correcto — centraliza strings para evitar errores de tipeo.
 */
export const ESTADOS_INGRESO = {
  PAGADA: 'pagada',
  PENDIENTE: 'pendiente',
  DEVOLUCION: 'devolucion',
};

export const ESTADOS_MIEMBRO = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
};

export const ESTADOS_INSCRIPCION = {
  PENDIENTE: 'pendiente',
  PAGADO: 'pagado',
  CANCELADO: 'cancelado',
};

export const ESTADOS_ACTIVIDAD = {
  PROGRAMADO: 'programado',
  EN_CURSO: 'en_curso',
  FINALIZADO: 'finalizado',
};
