import axios, { type InternalAxiosRequestConfig } from 'axios';
import { ApiError } from './ApiError';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const privateClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

privateClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

privateClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    const data = error.response?.data;

    // Rails 422: { errors: { campo: ['mensaje', ...] } }
    if (
      data?.errors &&
      typeof data.errors === 'object' &&
      !Array.isArray(data.errors)
    ) {
      const fieldErrors = data.errors as Record<string, string[]>;
      const message = Object.entries(fieldErrors)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join('. ');
      return Promise.reject(
        new ApiError(message || 'Error de validación', { fieldErrors, statusCode: status }),
      );
    }

    const message =
      (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ??
      data?.error ??
      data?.message ??
      'Ha ocurrido un error inesperado.';

    return Promise.reject(new ApiError(message, { statusCode: status }));
  },
);

export default privateClient;
