import { NavLink, Outlet } from 'react-router-dom';
import { ArrowDownCircle, Bell, CalendarDays, CreditCard, GraduationCap, LayoutGrid, LineChart, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react';

export const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-900">Panel Administracion</h1>
        </div>
        <nav className="px-4 py-6">
          <ul className="space-y-2 text-sm">
            <li>
              <NavLink
                to="/admin/miembros"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Users className="h-4 w-4" />
                Miembros
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/kpis"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <LineChart className="h-4 w-4" />
                KPIs
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/alertas"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Bell className="h-4 w-4" />
                Alertas
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/cuotas"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <CreditCard className="h-4 w-4" />
                Cuotas
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/egresos"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <ArrowDownCircle className="h-4 w-4" />
                Egresos
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/flujo-caja"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <TrendingUp className="h-4 w-4" />
                Flujo de caja
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/activos"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <LayoutGrid className="h-4 w-4" />
                Activos
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/activos/auditoria"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <ShieldCheck className="h-4 w-4" />
                Auditoria
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/actividades"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <CalendarDays className="h-4 w-4" />
                Actividades
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/eventos"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <GraduationCap className="h-4 w-4" />
                Eventos
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/reportes"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Wallet className="h-4 w-4" />
                Reportes
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="border-b bg-white shadow-sm">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Panel de Control</h2>
          </div>
        </header>
        <main className="px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
