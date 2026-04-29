export type TipoDocumento = 'CC' | 'NIT' | 'CE' | 'PP';
export type EstadoFinca = 'activo' | 'inactivo';

export interface Ubicacion {
  departamento: string;
  municipio: string;
  vereda?: string;
  coordenadas?: string;
  direccion?: string;
}

export interface Dueno {
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  email: string;
  telefono: string;
  direccion?: string;
}

export interface Finca {
  id: string;
  nombre: string;
  descripcion?: string;
  area: number;
  ubicacion: Ubicacion;
  dueno: Dueno;
  estado: EstadoFinca;
  fechaRegistro: string;
}

export interface FincaFormData {
  nombre: string;
  descripcion: string;
  area: string;
  ubicacion: {
    departamento: string;
    municipio: string;
    vereda: string;
    coordenadas: string;
    direccion: string;
  };
  dueno: {
    nombre: string;
    tipoDocumento: TipoDocumento;
    numeroDocumento: string;
    email: string;
    telefono: string;
    direccion: string;
  };
}

export interface FincaFilters {
  search: string;
  estado: EstadoFinca | 'todos';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
