export interface LecturaSensorRef {
  id: string;
  codigo: string;
  nombre: string;
}

export interface LecturaCultivoRef {
  id: string;
  nombre: string;
}

export interface LecturaVariableRef {
  id: string;
  nombre: string;
  unidad: string;
}

export interface Lectura {
  id: string;
  fecha: string;         // YYYY-MM-DD
  horaRegistro: string;  // HH:MM
  valor: number;
  sensor: LecturaSensorRef;
  cultivo: LecturaCultivoRef | null;
  variable: LecturaVariableRef;
}

export interface LecturasFilters {
  fechaDesde: string;
  fechaHasta: string;
  variableId: string;
}

export interface PaginatedLecturas {
  data: Lectura[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
