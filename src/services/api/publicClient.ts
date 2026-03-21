import axios from 'axios';

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
    const data = error.response?.data;
    const message =
      (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ??
      data?.error ??
      data?.message ??
      'Ha ocurrido un error inesperado.';
    return Promise.reject(new Error(message));
  },
);

export default publicClient;
