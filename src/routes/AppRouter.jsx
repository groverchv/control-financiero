import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { SocioLayout } from '../layouts/SocioLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { LandingPage } from '../features/auth/pages/LandingPage';
import { GestionMiembrosPage } from '../features/administracion/pages/GestionMiembrosPage';
import { DashboardKpisPage } from '../features/administracion/pages/DashboardKpisPage';
import { AlertasPage } from '../features/administracion/pages/AlertasPage';
import { PerfilSocioPage } from '../features/administracion/pages/PerfilSocioPage';
import { PortalSocioPage } from '../features/administracion/pages/PortalSocioPage';
import { RegistroCuotasPage } from '../features/finanzas/pages/RegistroCuotasPage';
import { HistorialCuotasPage } from '../features/finanzas/pages/HistorialCuotasPage';
import { RegistroEgresosPage } from '../features/finanzas/pages/RegistroEgresosPage';
import { IngresoExtraPage } from '../features/finanzas/pages/IngresoExtraPage';
import { FlujoCajaPage } from '../features/finanzas/pages/FlujoCajaPage';
import { ReportesFinancierosPage } from '../features/finanzas/pages/ReportesFinancierosPage';
import { GestionActivosPage } from '../features/patrimonio/pages/GestionActivosPage';
import { CatalogoActivosPage } from '../features/patrimonio/pages/CatalogoActivosPage';
import { NuevaAdquisicionPage } from '../features/patrimonio/pages/NuevaAdquisicionPage';
import { AuditoriaBlockPage } from '../features/patrimonio/pages/AuditoriaBlockPage';
import { GestionActividadesPage } from '../features/academico/pages/GestionActividadesPage';
import { AsignacionJuradoPage } from '../features/academico/pages/AsignacionJuradoPage';
import { BuscadorTalentoPage } from '../features/academico/pages/BuscadorTalentoPage';
import { GestionEventosPage } from '../features/academico/pages/GestionEventosPage';

export const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LandingPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute requiredRoles={['admin', 'secretario']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/miembros" element={<GestionMiembrosPage />} />
          <Route path="/admin/kpis" element={<DashboardKpisPage />} />
          <Route path="/admin/alertas" element={<AlertasPage />} />
          <Route path="/admin/cuotas" element={<RegistroCuotasPage />} />
          <Route path="/admin/cuotas/historial" element={<HistorialCuotasPage />} />
          <Route path="/admin/egresos" element={<RegistroEgresosPage />} />
          <Route path="/admin/ingresos-extra" element={<IngresoExtraPage />} />
          <Route path="/admin/reportes" element={<ReportesFinancierosPage />} />
          <Route path="/admin/flujo-caja" element={<FlujoCajaPage />} />
          <Route path="/admin/activos" element={<GestionActivosPage />} />
          <Route path="/admin/activos/catalogo" element={<CatalogoActivosPage />} />
          <Route path="/admin/activos/adquisicion" element={<NuevaAdquisicionPage />} />
          <Route path="/admin/activos/auditoria" element={<AuditoriaBlockPage />} />
          <Route path="/admin/actividades" element={<GestionActividadesPage />} />
          <Route path="/admin/actividades/jurados" element={<AsignacionJuradoPage />} />
          <Route path="/admin/talento" element={<BuscadorTalentoPage />} />
          <Route path="/admin/eventos" element={<GestionEventosPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute requiredRoles={['socio']}>
              <SocioLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/socio/perfil" element={<PerfilSocioPage />} />
          <Route path="/socio/portal" element={<PortalSocioPage />} />
        </Route>

        <Route path="*" element={<>Pagina no encontrada</>} />
      </Routes>
    </Router>
  );
};
