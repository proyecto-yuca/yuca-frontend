import type { SeveridadEvento } from './variables.types';

export interface LecturaSensorRef {
  id: string;
  codigo: string;
  nombre: string;
}

export interface LecturaCultivoRef {
  id: string;
  nombre: string;
}

export interface LecturaRango {
  eventoId: string;
  nombre: string;
  severidad: SeveridadEvento;
  min: number | null;
  max: number | null;
}

export interface LecturaVariableRef {
  id: string;
  nombre: string;
  unidad: string;
  /** Rangos de los eventos activos de la variable. */
  rangos: LecturaRango[];
}

export type EstadoLectura = 'normal' | SeveridadEvento;

export interface LecturaEventoDisparado {
  id: string;
  nombre: string;
  severidad: SeveridadEvento;
  tipo: 'bajo' | 'alto';
}

export interface Lectura {
  id: string;
  fecha: string;         // YYYY-MM-DD
  horaRegistro: string;  // HH:MM
  valor: number;
  sensor: LecturaSensorRef;
  cultivo: LecturaCultivoRef | null;
  variable: LecturaVariableRef;
  /** null si la variable no tiene eventos activos. */
  estado: EstadoLectura | null;
  eventos: LecturaEventoDisparado[];
}

export interface LecturasFilters {
  fechaDesde: string;
  fechaHasta: string;
  variableId: string;
  soloFueraDeRango?: boolean;
}

export interface PaginatedLecturas {
  data: Lectura[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
