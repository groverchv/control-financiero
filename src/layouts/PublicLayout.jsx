import { useState } from 'react';
import { Link, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { LogOut, User as UserIcon, Menu, X, ChevronDown, LayoutDashboard, ShieldCheck, GraduationCap } from 'lucide-react';

export const PublicLayout = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
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

  const authLinks = [
    { to: '/socio/estado-cuenta', label: 'Estado de Cuenta' },
    { to: '/socio/notificaciones', label: 'Notificaciones' },
    { to: '/socio/perfil', label: 'Mi Perfil' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-10">
            {/* MOBILE MENU BUTTON */}
            <button 
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="flex items-center gap-4 group relative">
              <button 
                className={`text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-80 transition-all ${isAuthenticated && (user?.rol === 'admin' || user?.rol === 'secretario') ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => isAuthenticated && (user?.rol === 'admin' || user?.rol === 'secretario') && setIsNavOpen(!isNavOpen)}
              >
                Control<span className="text-blue-600">Financiero</span>
                {isAuthenticated && (user?.rol === 'admin' || user?.rol === 'secretario') && <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />}
              </button>

              {isAuthenticated && isNavOpen && (user?.rol === 'admin' || user?.rol === 'secretario') && (
                <div className="absolute top-full left-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-1 mb-1 border-b">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cambiar espacio</p>
                  </div>
                  
                  {user?.rol === 'admin' && (
                    <Link 
                      to="/admin/kpis" 
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsNavOpen(false)}
                    >
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      Panel Administrativo
                    </Link>
                  )}

                  {user?.rol === 'secretario' && (
                    <Link 
                      to="/admin/miembros" 
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsNavOpen(false)}
                    >
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      Panel de Secretario
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            <nav className="hidden items-center gap-4 lg:gap-6 md:flex">
              {navLinks.map(link => (
                <NavLink 
                  key={link.to} 
                  to={link.to} 
                  className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
                >
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated && authLinks.map(link => (
                <NavLink 
                  key={link.to} 
                  to={link.to} 
                  className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="hidden lg:flex flex-col items-end mr-2">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{user?.nombre || 'Usuario'}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-100">
                          {user?.rol}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{user?.email}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm shrink-0">
                      {user?.foto ? (
                        <img src={user.foto} alt="Perfil" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                          <UserIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                
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
                className="rounded-xl bg-blue-600 px-5 sm:px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700"
              >
                Ingresar
              </Link>
            )}
          </div>

          {/* Mobile: Show login button or logout icon */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated ? (
              <button 
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Cerrar Sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>

        {/* MOBILE NAVIGATION */}
        {isMenuOpen && (
          <div className="border-t bg-white px-4 sm:px-6 py-5 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map(link => (
                <NavLink 
                  key={link.to} 
                  to={link.to} 
                  className={({ isActive }) => `text-base font-medium px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-900 hover:bg-slate-50'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated && (
                <>
                  <div className="my-2 border-t border-slate-100" />
                  {authLinks.map(link => (
                    <NavLink 
                      key={link.to} 
                      to={link.to} 
                      className={({ isActive }) => `text-base font-medium px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-900 hover:bg-slate-50'}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </>
              )}
              
              <div className="mt-3 border-t pt-4">
                {isAuthenticated ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        {user?.foto ? (
                          <img src={user.foto} alt="Perfil" className="h-full w-full object-cover rounded-full" />
                        ) : (
                          <UserIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{user?.nombre}</p>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 shrink-0">
                            {user?.rol}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t bg-white py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <p className="text-sm text-slate-500">© 2026 Control Financiero Institucional. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
