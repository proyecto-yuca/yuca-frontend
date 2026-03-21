import publicClient from '../api/publicClient';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '../../types/auth.types';

const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await publicClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await publicClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    const response = await publicClient.post<{ message: string }>(
      '/auth/forgot-password',
      data,
    );
    return response.data;
  },

  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export default authService;
