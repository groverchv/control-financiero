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
