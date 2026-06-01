import { useAuthStore } from '../store/authStore';
import { PERMISSIONS } from '../config/constants';

export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasPermission = (permission) => {
    if (!user) return false;
    const userPermissions = PERMISSIONS[user.rol] || [];
    return userPermissions.includes(permission);
  };

  const canAccess = (requiredPermissions) => {
    return requiredPermissions.every(hasPermission);
  };

  return { hasPermission, canAccess, userRole: user?.rol };
};
