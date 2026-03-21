import privateClient from '../api/privateClient';
import publicClient from '../api/publicClient';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../../types/auth.types';

const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await publicClient.post<AuthResponse>('/auth/sign_in', {
      user: data,
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await publicClient.post<AuthResponse>('/auth', {
      user: data,
    });
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    const response = await publicClient.post<{ message: string }>('/auth/password', {
      user: data,
    });
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    const response = await publicClient.put<{ message: string }>('/auth/password', {
      user: data,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await privateClient.delete('/auth/sign_out');
  },
};

export default authService;
