import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { usePermissions } from "@/hooks/usePermissions";

// Carga diferida (Lazy Loading) de páginas con exportaciones nombradas
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const LandingPage = lazy(() => import("@/features/auth/pages/LandingPage").then(m => ({ default: m.LandingPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const GestionMiembrosPage = lazy(() => import("@/features/administracion/pages/GestionMiembrosPage").then(m => ({ default: m.GestionMiembrosPage })));
const DashboardKpisPage = lazy(() => import("@/features/administracion/pages/DashboardKpisPage").then(m => ({ default: m.DashboardKpisPage })));
const PerfilSocioPage = lazy(() => import("@/features/administracion/pages/PerfilSocioPage").then(m => ({ default: m.PerfilSocioPage })));
const PortalSocioPage = lazy(() => import("@/features/administracion/pages/PortalSocioPage").then(m => ({ default: m.PortalSocioPage })));
const EstadoCuentaSocioPage = lazy(() => import("@/features/administracion/pages/EstadoCuentaSocioPage").then(m => ({ default: m.EstadoCuentaSocioPage })));
const RegistroCuotasPage = lazy(() => import("@/features/finanzas/pages/RegistroIngresosPage").then(m => ({ default: m.RegistroCuotasPage })));
const HistorialCuotasPage = lazy(() => import("@/features/finanzas/pages/HistorialCuotasPage").then(m => ({ default: m.HistorialCuotasPage })));
const HistorialActividadesPage = lazy(() => import("@/features/finanzas/pages/HistorialActividadesPage").then(m => ({ default: m.HistorialActividadesPage })));
const RegistroEgresosPage = lazy(() => import("@/features/finanzas/pages/RegistroEgresosPage").then(m => ({ default: m.RegistroEgresosPage })));
const GestionTiposFinanzasPage = lazy(() => import("@/features/finanzas/pages/GestionTiposFinanzasPage").then(m => ({ default: m.GestionTiposFinanzasPage })));

const GestionActivosPage = lazy(() => import("@/features/patrimonio/pages/GestionActivosPage").then(m => ({ default: m.GestionActivosPage })));
const CatalogoActivosPage = lazy(() => import("@/features/patrimonio/pages/CatalogoActivosPage").then(m => ({ default: m.CatalogoActivosPage })));
const NuevaAdquisicionPage = lazy(() => import("@/features/patrimonio/pages/NuevaAdquisicionPage").then(m => ({ default: m.NuevaAdquisicionPage })));
const GestionTiposActivoPage = lazy(() => import("@/features/patrimonio/pages/GestionTiposActivoPage").then(m => ({ default: m.GestionTiposActivoPage })));
const PlanAmortizacionPage = lazy(() => import("@/features/patrimonio/pages/PlanAmortizacionPage").then(m => ({ default: m.PlanAmortizacionPage })));

const GestionActividadesPage = lazy(() => import("@/features/academico/pages/GestionActividadesPage").then(m => ({ default: m.GestionActividadesPage })));
const AsignacionJuradoPage = lazy(() => import("@/features/academico/pages/AsignacionJuradoPage").then(m => ({ default: m.AsignacionJuradoPage })));
const AsignarJuradoPage = lazy(() => import("@/features/academico/pages/AsignarJuradoPage").then(m => ({ default: m.AsignarJuradoPage })));
const BuscadorTalentoPage = lazy(() => import("@/features/academico/pages/BuscadorTalentoPage").then(m => ({ default: m.BuscadorTalentoPage })));
const GestionTiposActividadPage = lazy(() => import("@/features/academico/pages/GestionTiposActividadPage").then(m => ({ default: m.GestionTiposActividadPage })));

const SocioNotificacionesPage = lazy(() => import("@/features/administracion/pages/SocioNotificacionesPage").then(m => ({ default: m.SocioNotificacionesPage })));
const AdminNotificacionesPage = lazy(() => import("@/features/administracion/pages/NotificacionesPage").then(m => ({ default: m.NotificacionesPage })));

const BackupPage = lazy(() => import("@/features/auditoria/pages/BackupPage").then(m => ({ default: m.BackupPage })));
const PublicActividadesPage = lazy(() => import("@/features/academico/pages/PublicCursosPage").then(m => ({ default: m.PublicCursosPage })));
const DetalleActividadPage = lazy(() => import("@/features/academico/pages/DetalleActividadPage").then(m => ({ default: m.DetalleActividadPage })));


const SuspenseLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
    <div className="w-full max-w-md px-8 space-y-4 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-full" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-5/6" />
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-1/3 mt-6" />
    </div>
  </div>
);

const AdminIndex = () => {
  const { userRole } = usePermissions();

  if (userRole === "admin") {
    return <Navigate to="/admin/kpis" replace />;
  }

  if (userRole === "secretario") {
    return <Navigate to="/admin/ingresos" replace />;
  }

  return <Navigate to="/" replace />;
};

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
      <p className="text-slate-400 mb-8 text-sm">
        Lo sentimos, la ruta que intentas buscar no existe o ha sido movida.
      </p>
      <Link
        to="/"
        className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  </div>
);

export const AppRouter = () => {
  useEffect(() => {
    const cleanupRefundedInscriptions = async () => {
      try {
        const { data: ingresosDevueltos, error: ingErr } = await supabase
          .from('ingreso')
          .select('id, inscripcion_id')
          .eq('estado', 'devolucion')
          .not('inscripcion_id', 'is', null);

        if (ingErr) throw ingErr;

        if (ingresosDevueltos && ingresosDevueltos.length > 0) {
          const inscripcionIds = ingresosDevueltos.map(i => i.inscripcion_id);

          const { data: inscripciones, error: insErr } = await supabase
            .from('inscripcion')
            .select('id, actividad_id')
            .in('id', inscripcionIds);

          if (!insErr && inscripciones && inscripciones.length > 0) {
            for (const ins of inscripciones) {
              await supabase
                .from('inscripcion')
                .delete()
                .eq('id', ins.id);

              const { data: actNow } = await supabase
                .from('actividad')
                .select('cupos')
                .eq('id', ins.actividad_id)
                .maybeSingle();

              if (actNow) {
                await supabase
                  .from('actividad')
                  .update({ cupos: (actNow.cupos || 0) + 1 })
                  .eq('id', ins.actividad_id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error during auto-cleanup of refunded inscriptions:', err);
      }
    };

    cleanupRefundedInscriptions();
  }, []);

  return (
    <Router>
      <Suspense fallback={<SuspenseLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/inicio" element={<LandingPage />} />
            <Route path="/actividades" element={<PublicActividadesPage />} />
            <Route path="/actividades/:id" element={<DetalleActividadPage />} />
            <Route path="/cursos" element={<PublicActividadesPage />} />
            <Route path="/cursos/:id" element={<DetalleActividadPage />} />
            <Route path="/" element={<LandingPage />} />

            <Route
              path="/socio/perfil"
              element={
                <ProtectedRoute requiredRoles={["socio", "admin", "secretario"]}>
                  <PerfilSocioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/socio/portal"
              element={
                <ProtectedRoute requiredRoles={["socio", "admin", "secretario"]}>
                  <PortalSocioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/socio/estado-cuenta"
              element={
                <ProtectedRoute requiredRoles={["socio", "admin", "secretario"]}>
                  <EstadoCuentaSocioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/socio/notificaciones"
              element={
                <ProtectedRoute requiredRoles={["socio", "admin", "secretario"]}>
                  <SocioNotificacionesPage />
                </ProtectedRoute>
              }
            />

          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminIndex />} />
            <Route
              path="/admin/miembros"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <GestionMiembrosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kpis"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <DashboardKpisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ingresos"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <RegistroCuotasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/historial-cuotas"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <HistorialCuotasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/historial-actividades"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <HistorialActividadesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/egresos"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <RegistroEgresosPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/tipos-transaccion"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <GestionTiposFinanzasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/activos"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <GestionActivosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tipos-activo"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <GestionTiposActivoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/activos/catalogo"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <CatalogoActivosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/activos/adquisicion"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <NuevaAdquisicionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/activos/amortizacion"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <PlanAmortizacionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/actividades"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <GestionActividadesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tipos-actividad"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <GestionTiposActividadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/asignar-jurado"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <AsignarJuradoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/actividades/jurados"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <AsignacionJuradoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/talento"
              element={
                <ProtectedRoute requiredRoles={["admin", "secretario"]}>
                  <BuscadorTalentoPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/backup"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <BackupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notificaciones"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AdminNotificacionesPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
};
