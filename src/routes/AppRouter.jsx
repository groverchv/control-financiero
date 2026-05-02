import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { LandingPage } from '../features/auth/pages/LandingPage';
import { GestionMiembrosPage } from '../features/administracion/pages/GestionMiembrosPage';
import { DashboardKpisPage } from '../features/administracion/pages/DashboardKpisPage';
import { AlertasPage } from '../features/administracion/pages/AlertasPage';
import { PerfilSocioPage } from '../features/administracion/pages/PerfilSocioPage';
import { PortalSocioPage } from '../features/administracion/pages/PortalSocioPage';
import { EstadoCuentaSocioPage } from '../features/administracion/pages/EstadoCuentaSocioPage';
import { RegistroCuotasPage } from '../features/finanzas/pages/RegistroCuotasPage';
import { HistorialCuotasPage } from '../features/finanzas/pages/HistorialCuotasPage';
import { RegistroEgresosPage } from '../features/finanzas/pages/RegistroEgresosPage';
import { IngresoExtraPage } from '../features/finanzas/pages/IngresoExtraPage';
import { FlujoCajaPage } from '../features/finanzas/pages/FlujoCajaPage';
import { ReportesFinancierosPage } from '../features/finanzas/pages/ReportesFinancierosPage';
import { GestionTiposFinanzasPage } from '../features/finanzas/pages/GestionTiposFinanzasPage';
import { GestionActivosPage } from '../features/patrimonio/pages/GestionActivosPage';
import { CatalogoActivosPage } from '../features/patrimonio/pages/CatalogoActivosPage';
import { NuevaAdquisicionPage } from '../features/patrimonio/pages/NuevaAdquisicionPage';
import { GestionTiposActivoPage } from '../features/patrimonio/pages/GestionTiposActivoPage';
import { GestionActividadesPage } from '../features/academico/pages/GestionActividadesPage';
import { AsignacionJuradoPage } from '../features/academico/pages/AsignacionJuradoPage';
import { BuscadorTalentoPage } from '../features/academico/pages/BuscadorTalentoPage';
import { GestionEventosPage } from '../features/academico/pages/GestionEventosPage';
import { NotificacionesPage } from '../features/administracion/pages/NotificacionesPage';

import { PublicEventosPage } from '../features/academico/pages/PublicEventosPage';
import { PublicCursosPage } from '../features/academico/pages/PublicCursosPage';
import { DetalleEventoPage } from '../features/academico/pages/DetalleEventoPage';
import { DetalleActividadPage } from '../features/academico/pages/DetalleActividadPage';

export const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/inicio" element={<LandingPage />} />
          <Route path="/eventos" element={<PublicEventosPage />} />
          <Route path="/eventos/:id" element={<DetalleEventoPage />} />
          <Route path="/cursos" element={<PublicCursosPage />} />
          <Route path="/cursos/:id" element={<DetalleActividadPage />} />
          <Route path="/" element={<LandingPage />} />
          
          <Route path="/socio/perfil" element={
            <ProtectedRoute requiredRoles={['socio', 'admin', 'secretario']}>
              <PerfilSocioPage />
            </ProtectedRoute>
          } />
          <Route path="/socio/portal" element={
            <ProtectedRoute requiredRoles={['socio', 'admin', 'secretario']}>
              <PortalSocioPage />
            </ProtectedRoute>
          } />
          <Route path="/socio/estado-cuenta" element={
            <ProtectedRoute requiredRoles={['socio', 'admin', 'secretario']}>
              <EstadoCuentaSocioPage />
            </ProtectedRoute>
          } />
          <Route path="/socio/notificaciones" element={
            <ProtectedRoute requiredRoles={['socio', 'admin', 'secretario']}>
              <NotificacionesPage />
            </ProtectedRoute>
          } />
        </Route>

        <Route
          element={
            <ProtectedRoute requiredRoles={['admin', 'secretario']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardKpisPage />} />
          <Route path="/admin/miembros" element={<GestionMiembrosPage />} />
          <Route path="/admin/kpis" element={<DashboardKpisPage />} />
          <Route path="/admin/ingresos" element={<RegistroCuotasPage />} />
          <Route path="/admin/egresos" element={<RegistroEgresosPage />} />
          <Route path="/admin/tipos-transaccion" element={<GestionTiposFinanzasPage />} />
          <Route path="/admin/activos" element={<GestionActivosPage />} />
          <Route path="/admin/tipos-activo" element={<GestionTiposActivoPage />} />
          <Route path="/admin/activos/catalogo" element={<CatalogoActivosPage />} />
          <Route path="/admin/activos/adquisicion" element={<NuevaAdquisicionPage />} />
          <Route path="/admin/actividades" element={<GestionActividadesPage />} />
          <Route path="/admin/actividades/jurados" element={<AsignacionJuradoPage />} />
          <Route path="/admin/talento" element={<BuscadorTalentoPage />} />
          <Route path="/admin/eventos" element={<GestionEventosPage />} />
        </Route>



        <Route path="*" element={<>Pagina no encontrada</>} />
      </Routes>
    </Router>
  );
};
