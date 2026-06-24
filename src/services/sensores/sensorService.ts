import privateClient from '../api/privateClient';
import { isApiError } from '../api/ApiError';
import type { Sensor, SensorFormData } from '../../types/sensor.types';

function buildBody(formData: SensorFormData) {
  const body: Record<string, unknown> = {
    codigo: formData.codigo,
    nombre: formData.nombre,
    descripcion: formData.descripcion || undefined,
    variable_ids: formData.variableIds,
  };

  if (formData.lat.trim() !== '' && formData.lng.trim() !== '') {
    body.lat = parseFloat(formData.lat);
    body.lng = parseFloat(formData.lng);
  }

  if (formData.cultivoId) {
    body.cultivo_id = formData.cultivoId;
  }

  return { sensor: body };
}

const sensorService = {
  async getAll(fincaId: string): Promise<Sensor[]> {
    const response = await privateClient.get<Sensor[]>(`/fincas/${fincaId}/sensores`);
    return response.data;
  },

  async getById(fincaId: string, id: string): Promise<Sensor | null> {
    try {
      const response = await privateClient.get<Sensor>(`/fincas/${fincaId}/sensores/${id}`);
      return response.data;
    } catch (error) {
      if (isApiError(error) && error.statusCode === 404) return null;
      throw error;
    }
  },

  async create(fincaId: string, formData: SensorFormData): Promise<Sensor> {
    const response = await privateClient.post<Sensor>(
      `/fincas/${fincaId}/sensores`,
      buildBody(formData),
    );
    return response.data;
  },

  async update(fincaId: string, id: string, formData: SensorFormData): Promise<Sensor> {
    const response = await privateClient.patch<Sensor>(
      `/fincas/${fincaId}/sensores/${id}`,
      buildBody(formData),
    );
    return response.data;
  },

  async toggle(fincaId: string, id: string): Promise<Sensor> {
    const response = await privateClient.patch<Sensor>(
      `/fincas/${fincaId}/sensores/${id}/toggle`,
    );
    return response.data;
  },

  async delete(fincaId: string, id: string): Promise<void> {
    await privateClient.delete(`/fincas/${fincaId}/sensores/${id}`);
  },
};

export default sensorService;
