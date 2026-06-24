import privateClient from '../api/privateClient';
import { isApiError } from '../api/ApiError';
import type { Variable, VariableFormData } from '../../types/variables.types';

const variablesService = {
  async getAll(): Promise<Variable[]> {
    const response = await privateClient.get<Variable[]>('/variables');
    return response.data;
  },

  async getById(id: string): Promise<Variable | null> {
    try {
      const response = await privateClient.get<Variable>(`/variables/${id}`);
      return response.data;
    } catch (error) {
      if (isApiError(error) && error.statusCode === 404) return null;
      throw error;
    }
  },

  async create(formData: VariableFormData): Promise<Variable> {
    const response = await privateClient.post<Variable>('/variables', {
      variable: {
        nombre: formData.nombre,
        unidad: formData.unidad,
        decimales: parseInt(formData.decimales, 10),
        descripcion: formData.descripcion || undefined,
      },
    });
    return response.data;
  },

  async update(id: string, formData: VariableFormData): Promise<Variable> {
    const response = await privateClient.patch<Variable>(`/variables/${id}`, {
      variable: {
        nombre: formData.nombre,
        unidad: formData.unidad,
        decimales: parseInt(formData.decimales, 10),
        descripcion: formData.descripcion || undefined,
      },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await privateClient.delete(`/variables/${id}`);
  },
};

export default variablesService;
