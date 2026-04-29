import privateClient from '../api/privateClient';
import type {
  LecturaSensor,
  SensoresFilters,
  PaginatedSensores,
} from '../../types/sensores.types';

const sensoresService = {
  async getLecturasByFinca(
    fincaId: string,
    filters: SensoresFilters,
    page: number,
    pageSize: number,
  ): Promise<PaginatedSensores> {
    // The API uses snake_case query params; SensoresFilters uses camelCase.
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };
    if (filters.fechaDesde) params.fecha_desde = filters.fechaDesde;
    if (filters.fechaHasta) params.fecha_hasta = filters.fechaHasta;
    if (filters.estado !== 'todos') params.estado = filters.estado;

    const response = await privateClient.get<PaginatedSensores>(
      `/fincas/${fincaId}/lecturas`,
      { params },
    );
    return response.data;
  },

  async getLatestReadings(fincaId: string): Promise<LecturaSensor[]> {
    const response = await privateClient.get<LecturaSensor[]>(
      `/fincas/${fincaId}/lecturas/recientes`,
    );
    return response.data;
  },
};

export default sensoresService;
