import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { PublicRoute } from './PublicRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { FincasPage } from '../pages/fincas/FincasPage';
import { CultivosPage } from '../pages/cultivos/CultivosPage';
import { VariablesPage } from '../pages/variables/VariablesPage';
import { SensoresPage } from '../pages/sensores/SensoresPage';
import { PermisosPage } from '../pages/permisos/PermisosPage';
import { UsuariosPage } from '../pages/usuarios/UsuariosPage';
import { LecturasPage } from '../pages/lecturas/LecturasPage';

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <PrivateRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/dashboard/fincas', element: <FincasPage /> },
      { path: '/dashboard/cultivos', element: <CultivosPage /> },
      { path: '/dashboard/variables', element: <VariablesPage /> },
      { path: '/dashboard/sensores', element: <SensoresPage /> },
      { path: '/dashboard/lecturas', element: <LecturasPage /> },
      { path: '/dashboard/permisos', element: <PermisosPage /> },
      { path: '/dashboard/usuarios', element: <UsuariosPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
