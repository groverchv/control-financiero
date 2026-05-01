import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { authApi } from '../features/auth/api/authApi';
import { useAuthStore } from '../store/authStore';

export const SocioLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-semibold text-slate-900">Portal del Socio</h1>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};
