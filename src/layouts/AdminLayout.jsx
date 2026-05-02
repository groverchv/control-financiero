import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { ArrowDownCircle, Bell, CalendarDays, CreditCard, GraduationCap, LayoutGrid, LineChart, LogOut, ShieldCheck, TrendingUp, Users, Wallet, Eye, ChevronDown, LayoutDashboard, Menu, X, Tags } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { useState } from 'react';

export const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Panel Administracion</h1>
          <button 
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={closeSidebar}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="h-[calc(100vh-61px)] overflow-y-auto px-4 py-6 pb-20">
          
          {/* DASHBOARD PRINCIPAL */}
          <div className="mb-6">
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink to="/admin/kpis" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <LineChart className="h-4 w-4" />
                  Dashboard KPIs
                </NavLink>
              </li>
            </ul>
          </div>

          {/* PAQUETE ADMINISTRACIÓN */}
          <div className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Administración
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink to="/admin/miembros" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <Users className="h-4 w-4" />
                  Miembros
                </NavLink>
              </li>
            </ul>
          </div>

          {/* PAQUETE FINANZAS */}
          <div className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Finanzas
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink to="/admin/ingresos" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <CreditCard className="h-4 w-4" />
                  Ingresos
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/egresos" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <ArrowDownCircle className="h-4 w-4" />
                  Egresos
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/tipos-transaccion" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <Tags className="h-4 w-4" />
                  Tipos de Ingreso y Egreso
                </NavLink>
              </li>
            </ul>
          </div>

          {/* PAQUETE PATRIMONIO */}
          <div className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Patrimonio
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink to="/admin/activos" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <LayoutGrid className="h-4 w-4" />
                  Activos
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/tipos-activo" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <Tags className="h-4 w-4" />
                  Tipos de Activos
                </NavLink>
              </li>
            </ul>
          </div>

          {/* PAQUETE ACADÉMICO */}
          <div>
            <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Académico
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink to="/admin/actividades" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <CalendarDays className="h-4 w-4" />
                  Actividades
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/eventos" onClick={closeSidebar} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <GraduationCap className="h-4 w-4" />
                  Eventos
                </NavLink>
              </li>
            </ul>
          </div>

        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button 
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4 group relative">
                <button 
                  className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-80 transition-all"
                  onClick={() => setIsNavOpen(!isNavOpen)}
                >
                  Control<span className="text-blue-600">Financiero</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />
                </button>

                {isNavOpen && (
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
                    
                    <Link 
                      to="/inicio" 
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsNavOpen(false)}
                    >
                      <Eye className="h-4 w-4 text-emerald-600" />
                      Portal Público
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{user?.nombre || 'Usuario'}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-100">
                    {user?.rol}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{user?.email}</span>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm shrink-0">
                {user?.foto ? (
                  <img src={user.foto} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    {user?.nombre?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl bg-red-50 px-2.5 sm:px-3 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
