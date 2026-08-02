import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  ArrowDownCircle,
  Bell,
  CalendarDays,
  CreditCard,
  History,
  LayoutGrid,
  LineChart,
  LogOut,
  Users,
  User as UserIcon,
  Menu,
  ChevronDown,
  X,
  Tags,
  Calculator,
  Eye,
  Sun,
  Moon,
  Monitor,
  Database,
  Search,
  QrCode,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../services/supabase";
import { useState, useEffect } from "react";
import { patrimonioApi } from "../features/patrimonio/api";
import { useTheme } from "../hooks/useTheme";

export const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [theme, setTheme] = useTheme();

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login");
    setShowLogoutConfirm(false);
  };

  const [adminUnreadCount, setAdminUnreadCount] = useState(0);

  useEffect(() => {
    // Sincronizar notificaciones de amortizacion pendientes
    if (user && user.id) {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      patrimonioApi.sincronizarNotificacionesAmortizacion(
        user.id,
        user.email,
        `${user.nombre || ""} ${user.apellidoPaterno || ""}`.trim(),
      );

      // Suscribirse al contador de notificaciones de amortización de activos pendientes
      const fetchAdminUnread = async () => {
        try {
          const { data: config } = await supabase
            .from("configuracion_cuotas")
            .select("dias_recordatorio_activos")
            .limit(1)
            .maybeSingle();
          const diasAviso = config?.dias_recordatorio_activos || 5;

          const { data: planes } = await supabase
            .from("plan_amortizacion")
            .select("fecha_vencimiento")
            .eq("estado", "pendiente");

          if (!planes) {
            setAdminUnreadCount(0);
            return;
          }

          const hoy = new Date();
          const count = planes.filter((p) => {
            const fechaVenc = new Date(p.fecha_vencimiento + "T00:00:00");
            const diffDias = Math.ceil(
              (fechaVenc - hoy) / (1000 * 60 * 60 * 24),
            );
            return diffDias <= diasAviso;
          }).length;

          setAdminUnreadCount(count);
        } catch (err) {
          console.error(
            "[AdminLayout] Error calculando notificaciones de amortización:",
            err,
          );
        }
      };

      fetchAdminUnread();

      const notifChannel = supabase
        .channel("admin-notif-count")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "plan_amortizacion" },
          fetchAdminUnread,
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notifChannel);
      };
    }
  }, [user]);

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
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm transform transition-transform duration-300 ease-in-out
        lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 flex flex-col
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold text-slate-900">
            Panel Administracion
          </h1>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={closeSidebar}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto no-scrollbar px-4 py-6 pb-20">
          {/* DASHBOARD PRINCIPAL */}
          {user?.rol === "admin" && (
            <div className="mb-6">
              <ul className="space-y-1 text-sm">
                <li>
                  <NavLink
                    to="/admin/kpis"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <LineChart className="h-4 w-4" />
                    Dashboard KPIs
                  </NavLink>
                </li>
              </ul>
            </div>
          )}

          {/* PAQUETE ADMINISTRACIÓN */}
          {(user?.rol === "admin" || user?.rol === "secretario") && (
            <div className="mb-6">
              <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Administración
              </h3>
              <ul className="space-y-1 text-sm">
                {user?.rol === "admin" && (
                  <li>
                    <NavLink
                      to="/admin/miembros"
                      onClick={closeSidebar}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                      }
                    >
                      <Users className="h-4 w-4" />
                      Miembros
                    </NavLink>
                  </li>
                )}
                <li>
                  <NavLink
                    to="/admin/talento"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <Search className="h-4 w-4" />
                    Buscar Talento
                  </NavLink>
                </li>
              </ul>
            </div>
          )}

          {/* PAQUETE FINANZAS */}
          <div className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Finanzas
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink
                  to="/admin/ingresos"
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  <CreditCard className="h-4 w-4" />
                  Ingresos
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/egresos"
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Egresos
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/historial-cuotas"
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  <History className="h-4 w-4" />
                  Historial de Cuotas
                </NavLink>
              </li>

              {user?.rol === "admin" && (
                <li>
                  <NavLink
                    to="/admin/tipos-transaccion"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <Tags className="h-4 w-4" />
                    Tipos de Ingreso y Egreso
                  </NavLink>
                </li>
              )}
              {user?.rol === "admin" && (
                <li>
                  <NavLink
                    to="/admin/qr"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <QrCode className="h-4 w-4" />
                    Gestionar QR
                  </NavLink>
                </li>
              )}
            </ul>
          </div>

          {/* PAQUETE ACADÉMICO */}
          <div className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Académico
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink
                  to="/admin/actividades"
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  <CalendarDays className="h-4 w-4" />
                  Actividades
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/historial-actividades"
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  <History className="h-4 w-4" />
                  Historial de Actividades
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/asignar-jurado"
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  <Users className="h-4 w-4" />
                  Asignar Jurado
                </NavLink>
              </li>
              {user?.rol === "admin" && (
                <li>
                  <NavLink
                    to="/admin/tipos-actividad"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <Tags className="h-4 w-4" />
                    Tipos de Actividad
                  </NavLink>
                </li>
              )}
            </ul>
          </div>

          {/* PAQUETE PATRIMONIO */}
          {user?.rol === "admin" && (
            <div className="mb-6">
              <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Patrimonio
              </h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <NavLink
                    to="/admin/activos"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Activos
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/activos/amortizacion"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <Calculator className="h-4 w-4" />
                    Plan de Amortización
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/notificaciones"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <Bell className="h-4 w-4" />
                    Notificaciones
                    {adminUnreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {adminUnreadCount > 99 ? "99+" : adminUnreadCount}
                      </span>
                    )}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/tipos-activo"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <Tags className="h-4 w-4" />
                    Tipos de Activos
                  </NavLink>
                </li>
              </ul>
            </div>
          )}

          {/* AUDITORIA */}
          {user?.rol === "admin" && (
            <div className="mb-6">
              <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Auditoria
              </h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <NavLink
                    to="/admin/backup"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`
                    }
                  >
                    <Database className="h-4 w-4" />
                    Copia de Seguridad
                  </NavLink>
                </li>
              </ul>
            </div>
          )}

          {/* Selector de Tema de 3 Opciones */}
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Tema
            </p>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  theme === "light"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                }`}
                title="Modo Claro"
              >
                <Sun className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Claro</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  theme === "dark"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                }`}
                title="Modo Oscuro"
              >
                <Moon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Oscuro</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  theme === "system"
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                }`}
                title="Usar tema del sistema"
              >
                <Monitor className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Sistema</span>
              </button>
            </div>
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
                  className="text-sm sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-80 transition-all"
                  onClick={() => setIsNavOpen(!isNavOpen)}
                >
                  <img
                    src="/logo-ap.png"
                    alt="Logo AP"
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight text-left">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-semibold leading-none">
                      Asociación de
                    </span>
                    <span className="text-slate-900">
                      Profesionales{" "}
                      <span className="text-emerald-600">Financieros</span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${isNavOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isNavOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-1 mb-1 border-b">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Cambiar espacio
                      </p>
                    </div>

                    <Link
                      to="/inicio"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                      onClick={() => setIsNavOpen(false)}
                    >
                      <Eye className="h-4 w-4 text-emerald-600" />
                      Portal Público
                    </Link>
                  </div>
                )}
              </div>
            </div>
            {/* Desktop Profile Block */}
            <div className="hidden items-center gap-3 sm:gap-4 min-w-0 shrink-0 md:flex">
              <div className="flex flex-col items-end text-right flex min-w-0 mr-2">
                <span className="text-sm font-bold text-slate-900 truncate max-w-[100px] sm:max-w-[180px]">
                  {user?.nombre || "Usuario"}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[100px] sm:max-w-[180px]">
                  {user?.email}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm">
                  {user?.foto ? (
                    <img
                      src={user.foto}
                      alt="Perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <UserIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-blue-600 border border-blue-100">
                  {user?.rol}
                </span>
              </div>
              <button
                onClick={handleLogoutClick}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Profile Block */}
            <div className="flex items-center gap-2 md:hidden min-w-0 shrink-0 ml-auto">
              <div className="flex flex-col items-end text-right min-w-0">
                <span className="text-[10px] font-bold text-slate-900 truncate max-w-[60px]">
                  {user?.nombre?.split(" ")[0] || "Admin"}
                </span>
                <span className="text-[8px] text-slate-500 truncate max-w-[60px]">
                  {user?.email}
                </span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shadow-sm shrink-0 relative">
                {user?.foto ? (
                  <img
                    src={user.foto}
                    alt="Perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-[10px]">
                    {user?.nombre?.substring(0, 1) || "A"}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-50 px-1 py-0.5 text-[6px] font-black uppercase tracking-wider text-blue-600 border border-blue-100 shadow-sm shadow-blue-500/10">
                  {user?.rol?.substring(0, 5) || "Admin"}
                </span>
              </div>
              <button
                onClick={handleLogoutClick}
                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 shrink-0 transition-colors"
                title="Cerrar Sesión"
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

      {/* MODAL DE CONFIRMACIÓN DE CIERRE DE SESIÓN */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLogoutConfirm(false)}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 scale-100 animate-in fade-in zoom-in-95 duration-200 z-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
              <LogOut className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              ¿Confirmar cierre de sesión?
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que ingresar
              tus credenciales nuevamente para acceder al panel de
              administración.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 hover:bg-red-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
