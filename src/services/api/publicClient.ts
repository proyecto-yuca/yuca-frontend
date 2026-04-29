import axios from 'axios';
import { ApiError } from './ApiError';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const publicClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

publicClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const data = error.response?.data;

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

export default publicClient;
