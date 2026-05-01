import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { LogOut, User as UserIcon, Menu, X } from 'lucide-react';

export const PublicLayout = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/inicio');
    setIsMenuOpen(false);
  };

  const navLinks = [
    { to: '/inicio', label: 'Inicio' },
    { to: '/eventos', label: 'Eventos' },
    { to: '/cursos', label: 'Cursos' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4 md:gap-10">
            {/* MOBILE MENU BUTTON */}
            <button 
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <Link to="/inicio" className="text-xl font-bold tracking-tight text-slate-900">
              Control<span className="text-blue-600">Financiero</span>
            </Link>
            
            <nav className="hidden items-center gap-6 md:flex">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} className="text-sm font-medium text-slate-600 hover:text-blue-600">
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && user?.rol === 'socio' && (
                <>
                  <Link to="/socio/portal" className="text-sm font-medium text-slate-600 hover:text-blue-600">Estado de Cuenta</Link>
                  <Link to="/socio/perfil" className="text-sm font-medium text-slate-600 hover:text-blue-600">Mi Perfil</Link>
                </>
              )}
            </nav>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end mr-2">
                  <span className="text-sm font-bold text-slate-900">{user?.nombre}</span>
                  <span className="text-xs text-slate-500">{user?.email}</span>
                </div>

                {user?.rol !== 'socio' && (
                  <Link 
                    to="/admin/kpis" 
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Panel Admin
                  </Link>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Cerrar Sesión"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>

        {/* MOBILE NAVIGATION */}
        {isMenuOpen && (
          <div className="border-t bg-white px-6 py-6 md:hidden">
            <nav className="flex flex-col gap-4">
              {navLinks.map(link => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className="text-lg font-medium text-slate-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && user?.rol === 'socio' && (
                <>
                  <Link to="/socio/portal" className="text-lg font-medium text-slate-900" onClick={() => setIsMenuOpen(false)}>Estado de Cuenta</Link>
                  <Link to="/socio/perfil" className="text-lg font-medium text-slate-900" onClick={() => setIsMenuOpen(false)}>Mi Perfil</Link>
                </>
              )}
              
              <div className="mt-4 border-t pt-4">
                {isAuthenticated ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user?.nombre}</p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                      </div>
                    </div>
                    {user?.rol !== 'socio' && (
                      <Link 
                        to="/admin/kpis" 
                        className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Panel Admin
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Ingresar
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <Outlet />
      </main>

      <footer className="border-t bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-slate-500">© 2026 Control Financiero Institucional. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
