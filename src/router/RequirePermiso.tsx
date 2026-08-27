import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { PermisoAcciones } from '../types/auth.types';

interface RequirePermisoProps {
  modulo: string;
  accion?: keyof PermisoAcciones;
  children: React.ReactNode;
}

export function RequirePermiso({ modulo, accion = 'ver', children }: RequirePermisoProps) {
  const { puede } = useAuth();

  if (!puede(modulo, accion)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
