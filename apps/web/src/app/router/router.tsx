/** Árbol central de rutas. Layouts anidados preservan navbar, menú y footer al navegar. */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { BranchesPage } from '../../features/branches/pages/BranchesPage';
import { BranchDetailPage } from '../../features/branches/pages/BranchDetailPage';
import { ProceduresPage } from '../../features/procedures/pages/ProceduresPage';
import { AvailabilityPage } from '../../features/availability/pages/AvailabilityPage';
import { AppointmentsPage } from '../../features/appointments/pages/AppointmentsPage';
import { ReportsPage } from '../../features/reports/pages/ReportsPage';
import { UsersPage } from '../../features/users/pages/UsersPage';
import { IntegrationPage } from '../../features/integration/pages/IntegrationPage';
import { NotFoundPage } from '../../features/system/NotFoundPage';
import { SettingsPage } from '../../features/system/SettingsPage';

export const router = createBrowserRouter([
  { element: <AuthLayout />, children: [{ path: '/acceso', element: <LoginPage /> }] },
  {
    element: <DashboardLayout />,
    children: [
      { path: '/', element: <Navigate to="/inicio" replace /> },
      { path: '/inicio', element: <DashboardPage /> },
      { path: '/sedes', element: <BranchesPage /> },
      { path: '/sedes/:sedeId', element: <BranchDetailPage /> },
      { path: '/sedes/:sedeId/tramites', element: <BranchDetailPage /> },
      { path: '/tramites', element: <ProceduresPage /> },
      { path: '/disponibilidad', element: <AvailabilityPage /> },
      { path: '/citas', element: <AppointmentsPage /> },
      { path: '/reportes', element: <ReportsPage /> },
      { path: '/usuarios', element: <UsersPage /> },
      { path: '/configuracion', element: <SettingsPage /> },
      { path: '/configuracion/conexion', element: <IntegrationPage /> },
      { path: '/conexion', element: <Navigate to="/configuracion/conexion" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
