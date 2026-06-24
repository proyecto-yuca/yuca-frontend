import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { PublicRoute } from './PublicRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { FincasPage } from '../pages/fincas/FincasPage';
import { FincaSensoresPage } from '../pages/fincas/FincaSensoresPage';
import { CultivosPage } from '../pages/cultivos/CultivosPage';
import { VariablesPage } from '../pages/variables/VariablesPage';

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
      { path: '/dashboard/fincas/:fincaId/sensores', element: <FincaSensoresPage /> },
      { path: '/dashboard/cultivos', element: <CultivosPage /> },
      { path: '/dashboard/variables', element: <VariablesPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
