import privateClient from '../api/privateClient';
import { isApiError } from '../api/ApiError';
import type { Cultivo, CultivoFormData } from '../../types/cultivos.types';

function getValidPuntos(formData: CultivoFormData) {
  return formData.puntosUbicacion
    .filter(p => p.lat.trim() !== '' && p.lng.trim() !== '')
    .map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
}

const cultivosService = {
  async getAll(fincaId: string): Promise<Cultivo[]> {
    const response = await privateClient.get<Cultivo[]>(`/fincas/${fincaId}/cultivos`);
    return response.data;
  },

  async getById(fincaId: string, id: string): Promise<Cultivo | null> {
    try {
      const response = await privateClient.get<Cultivo>(`/fincas/${fincaId}/cultivos/${id}`);
      return response.data;
    } catch (error) {
      if (isApiError(error) && error.statusCode === 404) return null;
      throw error;
    }
  },

  async create(fincaId: string, formData: CultivoFormData): Promise<Cultivo> {
    const puntos = getValidPuntos(formData);
    const body: { cultivo: Record<string, unknown> } = {
      cultivo: {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
      },
    };
    if (puntos.length > 0) body.cultivo.puntos_ubicacion = puntos;
    const response = await privateClient.post<Cultivo>(`/fincas/${fincaId}/cultivos`, body);
    return response.data;
  },

  async update(fincaId: string, id: string, formData: CultivoFormData): Promise<Cultivo> {
    const puntos = getValidPuntos(formData);
    const response = await privateClient.patch<Cultivo>(`/fincas/${fincaId}/cultivos/${id}`, {
      cultivo: {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        puntos_ubicacion: puntos,
      },
    });
    return response.data;
  },

  async delete(fincaId: string, id: string): Promise<void> {
    await privateClient.delete(`/fincas/${fincaId}/cultivos/${id}`);
  },
};

export default cultivosService;
