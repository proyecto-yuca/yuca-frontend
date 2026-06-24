import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { User, Permisos, PermisoAcciones } from '../types/auth.types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  permisos: Permisos | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (token: string, user: User, permisos?: Permisos) => void;
  signOut: () => void;
  puede: (modulo: string, accion?: keyof PermisoAcciones) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permisos, setPermisos] = useState<Permisos | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedPermisos = localStorage.getItem('permisos');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedPermisos) setPermisos(JSON.parse(storedPermisos));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('permisos');
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = useCallback((newToken: string, newUser: User, newPermisos: Permisos = {}) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('permisos', JSON.stringify(newPermisos));
    setToken(newToken);
    setUser(newUser);
    setPermisos(newPermisos);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permisos');
    setToken(null);
    setUser(null);
    setPermisos(null);
  }, []);

  // Returns true if the user has the given permission for the given module.
  // If permisos hasn't loaded yet, allows everything (avoids flash of hidden content).
  const puede = useCallback((modulo: string, accion: keyof PermisoAcciones = 'ver'): boolean => {
    if (!permisos) return true;
    return permisos[modulo]?.[accion] ?? false;
  }, [permisos]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permisos,
        isAuthenticated: !!token,
        isLoading,
        signIn,
        signOut,
        puede,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
