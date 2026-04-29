import privateClient from '../api/privateClient';
import { isApiError } from '../api/ApiError';
import type { Finca, FincaFormData, FincaFilters, PaginatedResult } from '../../types/fincas.types';

// Maps the camelCase FincaFormData the form produces to the
// nested body shape the Rails API expects.
function buildBody(formData: FincaFormData) {
  return {
    finca: {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      area: parseFloat(formData.area),
      ubicacion: {
        departamento: formData.ubicacion.departamento,
        municipio: formData.ubicacion.municipio,
        vereda: formData.ubicacion.vereda || undefined,
        coordenadas: formData.ubicacion.coordenadas || undefined,
        direccion: formData.ubicacion.direccion || undefined,
      },
      dueno: {
        nombre: formData.dueno.nombre,
        tipoDocumento: formData.dueno.tipoDocumento,
        numeroDocumento: formData.dueno.numeroDocumento,
        email: formData.dueno.email,
        telefono: formData.dueno.telefono,
        direccion: formData.dueno.direccion || undefined,
      },
    },
  };
}

const fincasService = {
  async getAll(
    filters: FincaFilters,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Finca>> {
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };
    if (filters.search) params.search = filters.search;
    if (filters.estado !== 'todos') params.estado = filters.estado;

    const response = await privateClient.get<PaginatedResult<Finca>>('/fincas', { params });
    return response.data;
  },

  async getById(id: string): Promise<Finca | null> {
    try {
      const response = await privateClient.get<Finca>(`/fincas/${id}`);
      return response.data;
    } catch (error) {
      if (isApiError(error) && error.statusCode === 404) return null;
      throw error;
    }
  },

  async create(formData: FincaFormData): Promise<Finca> {
    const response = await privateClient.post<Finca>('/fincas', buildBody(formData));
    return response.data;
  },

  async update(id: string, formData: FincaFormData): Promise<Finca> {
    const response = await privateClient.patch<Finca>(`/fincas/${id}`, buildBody(formData));
    return response.data;
  },

  async toggleEstado(id: string): Promise<Finca> {
    const response = await privateClient.patch<Finca>(`/fincas/${id}/estado`);
    return response.data;
  },
};

export default fincasService;
