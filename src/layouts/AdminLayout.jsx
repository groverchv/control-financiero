import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowDownCircle, Bell, CalendarDays, CreditCard, GraduationCap, LayoutGrid, LineChart, LogOut, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

export const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-900">Panel Administracion</h1>
        </div>
        <nav className="h-[calc(100vh-61px)] overflow-y-auto px-4 py-6 pb-20">
          
          {/* DASHBOARD PRINCIPAL */}
          <div className="mb-6">
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink to="/admin/kpis" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
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
                <NavLink to="/admin/miembros" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <Users className="h-4 w-4" />
                  Miembros
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/alertas" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <Bell className="h-4 w-4" />
                  Alertas
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
                <NavLink to="/admin/cuotas" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <CreditCard className="h-4 w-4" />
                  Cuotas
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/egresos" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <ArrowDownCircle className="h-4 w-4" />
                  Egresos
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/flujo-caja" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <TrendingUp className="h-4 w-4" />
                  Flujo de caja
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/reportes" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <Wallet className="h-4 w-4" />
                  Reportes
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
                <NavLink to="/admin/activos" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <LayoutGrid className="h-4 w-4" />
                  Activos
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/activos/auditoria" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <ShieldCheck className="h-4 w-4" />
                  Auditoria
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
                <NavLink to="/admin/actividades" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <CalendarDays className="h-4 w-4" />
                  Actividades
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/eventos" className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <GraduationCap className="h-4 w-4" />
                  Eventos
                </NavLink>
              </li>
            </ul>
          </div>

        </nav>
      </aside>

      <div className="flex-1">
        <header className="border-b bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Panel de Control</h2>
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900">{user?.nombre}</span>
                <span className="text-xs text-slate-500">{user?.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>
        <main className="px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
