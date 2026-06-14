import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { Spinner } from '../components/ui';

export const ProtectedRoute = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { canAccess, userRole } = usePermissions();

  // Mientras está cargando, mostrar spinner en vez de redirigir
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        <Spinner size="md" />
        <span className="ml-2">Validando sesion...</span>
      </div>
    );
  }

  // Si no está autenticado y tampoco hay caché local, redirigir al login
  if (!isAuthenticated && !user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol requerido (usando el rol del store que puede venir de caché)
  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole || '')) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermissions.length > 0 && !canAccess(requiredPermissions)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
