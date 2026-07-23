import privateClient from '../api/privateClient';
import type { Lectura, LecturasFilters, PaginatedLecturas } from '../../types/lecturas.types';

const lecturasService = {
  async getAll(
    fincaId: string,
    sensorId: string,
    filters: Partial<LecturasFilters>,
    page: number,
    pageSize: number,
  ): Promise<PaginatedLecturas> {
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };
    if (filters.fechaDesde) params.fecha_desde = filters.fechaDesde;
    if (filters.fechaHasta) params.fecha_hasta = filters.fechaHasta;
    if (filters.variableId) params.variable_id = filters.variableId;

    const response = await privateClient.get<PaginatedLecturas>(
      `/fincas/${fincaId}/sensores/${sensorId}/lecturas`,
      { params },
    );
    return response.data;
  },

  async create(
    fincaId: string,
    sensorId: string,
    data: { variableId: string; fecha: string; horaRegistro: string; valor: number },
  ): Promise<Lectura> {
    const response = await privateClient.post<Lectura>(
      `/fincas/${fincaId}/sensores/${sensorId}/lecturas`,
      {
        lectura: {
          variable_id: data.variableId,
          fecha: data.fecha,
          hora_registro: data.horaRegistro,
          valor: data.valor,
        },
      },
    );
    return response.data;
  },
};

export default lecturasService;
