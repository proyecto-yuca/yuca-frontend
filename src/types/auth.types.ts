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

export interface AuthResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  error?: string;
  errors?: string[];
  message?: string;
}
