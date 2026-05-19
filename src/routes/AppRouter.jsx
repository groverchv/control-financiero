import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { LandingPage } from "../features/auth/pages/LandingPage";
import { GestionMiembrosPage } from "../features/administracion/pages/GestionMiembrosPage";
import { DashboardKpisPage } from "../features/administracion/pages/DashboardKpisPage";
import { PerfilSocioPage } from "../features/administracion/pages/PerfilSocioPage";
import { PortalSocioPage } from "../features/administracion/pages/PortalSocioPage";
import { EstadoCuentaSocioPage } from "../features/administracion/pages/EstadoCuentaSocioPage";
import { RegistroCuotasPage } from "../features/finanzas/pages/RegistroIngresosPage";
import { HistorialCuotasPage } from "../features/finanzas/pages/HistorialCuotasPage";
import { RegistroEgresosPage } from "../features/finanzas/pages/RegistroEgresosPage";
import { GestionTiposFinanzasPage } from "../features/finanzas/pages/GestionTiposFinanzasPage";
import { GestionActivosPage } from "../features/patrimonio/pages/GestionActivosPage";
import { CatalogoActivosPage } from "../features/patrimonio/pages/CatalogoActivosPage";
import { NuevaAdquisicionPage } from "../features/patrimonio/pages/NuevaAdquisicionPage";
import { GestionTiposActivoPage } from "../features/patrimonio/pages/GestionTiposActivoPage";
import { PlanAmortizacionPage } from "../features/patrimonio/pages/PlanAmortizacionPage";
import { GestionActividadesPage } from "../features/academico/pages/GestionActividadesPage";
import { AsignacionJuradoPage } from "../features/academico/pages/AsignacionJuradoPage";
import { AsignarJuradoPage } from "../features/academico/pages/AsignarJuradoPage";
import { BuscadorTalentoPage } from "../features/academico/pages/BuscadorTalentoPage";
import { GestionTiposActividadPage } from "../features/academico/pages/GestionTiposActividadPage";
import { SocioNotificacionesPage } from "../features/administracion/pages/SocioNotificacionesPage";
import { NotificacionesPage as AdminNotificacionesPage } from "../features/administracion/pages/NotificacionesPage";
import { AuditoriaPage } from "../features/auditoria/pages/AuditoriaPage";
import { TransparenciaPage } from "../features/auditoria/pages/TransparenciaPage";
import { PublicCursosPage as PublicActividadesPage } from "../features/academico/pages/PublicCursosPage";
import { DetalleActividadPage } from "../features/academico/pages/DetalleActividadPage";

export const AppRouter = () => {
  return (
    <Router>
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
          element={
            <ProtectedRoute requiredRoles={["admin", "secretario"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <ProtectedRoute requiredRoles={["admin"]}>
                <DashboardKpisPage />
              </ProtectedRoute>
            }
          />
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
            element={<GestionTiposActividadPage />}
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
    </Router>
  );
};
