export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  reset_password_token: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateProfileRequest {
  email?: string;
  password?: string;
  password_confirmation?: string;
  current_password: string;
}

export interface Rol {
  id: number;
  identificador: string;
  nombre: string;
  sistema: boolean;
}

export interface PermisoAcciones {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export type Permisos = Record<string, PermisoAcciones>;

export interface User {
  id: number;
  name: string;
  email: string;
  rol: Rol;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  permisos: Permisos;
}

export interface ApiError {
  error?: string;
  errors?: string[];
  message?: string;
}
