import privateClient from '../api/privateClient';
import type { AlertasFilters, PaginatedAlertas } from '../../types/alertas.types';

const alertasService = {
  async getAll(
    fincaId: string,
    filters: AlertasFilters,
    page: number,
    pageSize: number,
  ): Promise<PaginatedAlertas> {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filters.sensorId) params.sensor_id = filters.sensorId;
    if (filters.variableId) params.variable_id = filters.variableId;
    if (filters.eventoId) params.evento_id = filters.eventoId;
    if (filters.severidad) params.severidad = filters.severidad;
    if (filters.fechaDesde && filters.fechaHasta) {
      params.fecha_desde = filters.fechaDesde;
      params.fecha_hasta = filters.fechaHasta;
    }

    const response = await privateClient.get<PaginatedAlertas>(`/fincas/${fincaId}/alertas`, { params });
    return response.data;
  },
};

export default alertasService;
