import type { SeveridadEvento } from './variables.types';

export type TipoAlerta = 'bajo' | 'alto';
export type MotivoOmision = 'intervalo' | 'sin_correo' | 'sin_destinatarios';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  severidad: SeveridadEvento;
  valor: number;
  rango: { min: number | null; max: number | null };
  evento: { id: string; nombre: string };
  variable: { id: string; nombre: string; unidad: string };
  sensor: { id: string; codigo: string; nombre: string };
  cultivo: { id: string; nombre: string } | null;
  fecha: string;
  horaRegistro: string;
  envio: {
    enviadoAt: string | null;
    emails: string[];
    omitido: boolean;
    motivoOmision: MotivoOmision | null;
    error: string | null;
  };
  createdAt: string;
}

export interface AlertasFilters {
  sensorId?: string;
  variableId?: string;
  eventoId?: string;
  severidad?: SeveridadEvento | '';
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PaginatedAlertas {
  data: Alerta[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
