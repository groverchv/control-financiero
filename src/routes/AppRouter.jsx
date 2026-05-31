import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { PublicLayout } from "../layouts/PublicLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import { Spinner } from "../components/ui";

// Carga diferida (Lazy Loading) de páginas con exportaciones nombradas
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const LandingPage = lazy(() => import("../features/auth/pages/LandingPage").then(m => ({ default: m.LandingPage })));
const GestionMiembrosPage = lazy(() => import("../features/administracion/pages/GestionMiembrosPage").then(m => ({ default: m.GestionMiembrosPage })));
const DashboardKpisPage = lazy(() => import("../features/administracion/pages/DashboardKpisPage").then(m => ({ default: m.DashboardKpisPage })));
const PerfilSocioPage = lazy(() => import("../features/administracion/pages/PerfilSocioPage").then(m => ({ default: m.PerfilSocioPage })));
const PortalSocioPage = lazy(() => import("../features/administracion/pages/PortalSocioPage").then(m => ({ default: m.PortalSocioPage })));
const EstadoCuentaSocioPage = lazy(() => import("../features/administracion/pages/EstadoCuentaSocioPage").then(m => ({ default: m.EstadoCuentaSocioPage })));
const RegistroCuotasPage = lazy(() => import("../features/finanzas/pages/RegistroIngresosPage").then(m => ({ default: m.RegistroCuotasPage })));
const HistorialCuotasPage = lazy(() => import("../features/finanzas/pages/HistorialCuotasPage").then(m => ({ default: m.HistorialCuotasPage })));
const HistorialActividadesPage = lazy(() => import("../features/finanzas/pages/HistorialActividadesPage").then(m => ({ default: m.HistorialActividadesPage })));
const RegistroEgresosPage = lazy(() => import("../features/finanzas/pages/RegistroEgresosPage").then(m => ({ default: m.RegistroEgresosPage })));
const GestionTiposFinanzasPage = lazy(() => import("../features/finanzas/pages/GestionTiposFinanzasPage").then(m => ({ default: m.GestionTiposFinanzasPage })));

const GestionActivosPage = lazy(() => import("../features/patrimonio/pages/GestionActivosPage").then(m => ({ default: m.GestionActivosPage })));
const CatalogoActivosPage = lazy(() => import("../features/patrimonio/pages/CatalogoActivosPage").then(m => ({ default: m.CatalogoActivosPage })));
const NuevaAdquisicionPage = lazy(() => import("../features/patrimonio/pages/NuevaAdquisicionPage").then(m => ({ default: m.NuevaAdquisicionPage })));
const GestionTiposActivoPage = lazy(() => import("../features/patrimonio/pages/GestionTiposActivoPage").then(m => ({ default: m.GestionTiposActivoPage })));
const PlanAmortizacionPage = lazy(() => import("../features/patrimonio/pages/PlanAmortizacionPage").then(m => ({ default: m.PlanAmortizacionPage })));

const GestionActividadesPage = lazy(() => import("../features/academico/pages/GestionActividadesPage").then(m => ({ default: m.GestionActividadesPage })));
const AsignacionJuradoPage = lazy(() => import("../features/academico/pages/AsignacionJuradoPage").then(m => ({ default: m.AsignacionJuradoPage })));
const AsignarJuradoPage = lazy(() => import("../features/academico/pages/AsignarJuradoPage").then(m => ({ default: m.AsignarJuradoPage })));
const BuscadorTalentoPage = lazy(() => import("../features/academico/pages/BuscadorTalentoPage").then(m => ({ default: m.BuscadorTalentoPage })));
const GestionTiposActividadPage = lazy(() => import("../features/academico/pages/GestionTiposActividadPage").then(m => ({ default: m.GestionTiposActividadPage })));

const SocioNotificacionesPage = lazy(() => import("../features/administracion/pages/SocioNotificacionesPage").then(m => ({ default: m.SocioNotificacionesPage })));
const AdminNotificacionesPage = lazy(() => import("../features/administracion/pages/NotificacionesPage").then(m => ({ default: m.NotificacionesPage })));
const AuditoriaPage = lazy(() => import("../features/auditoria/pages/AuditoriaPage").then(m => ({ default: m.AuditoriaPage })));
const TransparenciaPage = lazy(() => import("../features/auditoria/pages/TransparenciaPage").then(m => ({ default: m.TransparenciaPage })));
const PublicActividadesPage = lazy(() => import("../features/academico/pages/PublicCursosPage").then(m => ({ default: m.PublicCursosPage })));
const DetalleActividadPage = lazy(() => import("../features/academico/pages/DetalleActividadPage").then(m => ({ default: m.DetalleActividadPage })));

const SuspenseLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50 backdrop-blur-sm">
    <div className="flex flex-col items-center space-y-4">
      <Spinner size="lg" />
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Cargando Módulo Institucional...</p>
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
            <Route
              path="/transparencia"
              element={
                <ProtectedRoute requiredRoles={["socio", "admin", "secretario"]}>
                  <TransparenciaPage />
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
            <Route path="/admin/ingresos" element={<RegistroCuotasPage />} />
            <Route
              path="/admin/historial-cuotas"
              element={<HistorialCuotasPage />}
            />
            <Route
              path="/admin/historial-actividades"
              element={<HistorialActividadesPage />}
            />
            <Route path="/admin/egresos" element={<RegistroEgresosPage />} />

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
              element={<GestionActividadesPage />}
            />
            <Route
              path="/admin/tipos-actividad"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <GestionTiposActividadPage />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/asignar-jurado" element={<AsignarJuradoPage />} />
            <Route
              path="/admin/actividades/jurados"
              element={<AsignacionJuradoPage />}
            />
            <Route
              path="/admin/talento"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <BuscadorTalentoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/auditoria"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AuditoriaPage />
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

          <Route path="*" element={<>Pagina no encontrada</>} />
        </Routes>
      </Suspense>
    </Router>
  );
};
