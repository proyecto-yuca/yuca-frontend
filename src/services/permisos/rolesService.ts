import privateClient from '../api/privateClient';
import { isApiError } from '../api/ApiError';
import type { Rol, RolFormData } from '../../types/permisos.types';

const rolesService = {
  async getAll(): Promise<Rol[]> {
    const response = await privateClient.get<Rol[]>('/roles');
    return response.data;
  },

  async getById(id: string): Promise<Rol | null> {
    try {
      const response = await privateClient.get<Rol>(`/roles/${id}`);
      return response.data;
    } catch (error) {
      if (isApiError(error) && error.statusCode === 404) return null;
      throw error;
    }
  },

  async create(formData: RolFormData): Promise<Rol> {
    const response = await privateClient.post<Rol>('/roles', {
      rol: {
        identificador: formData.identificador,
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
      },
    });
    return response.data;
  },

  async update(id: string, formData: RolFormData): Promise<Rol> {
    const response = await privateClient.patch<Rol>(`/roles/${id}`, {
      rol: {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
      },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await privateClient.delete(`/roles/${id}`);
  },
};

export default rolesService;
