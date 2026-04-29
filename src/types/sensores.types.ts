export type EstadoLectura = 'normal' | 'alerta' | 'critico';

export interface LecturaSensor {
  id: string;
  loteId: string;
  fecha: string;         // YYYY-MM-DD
  horaRegistro: string;  // HH:MM (UTC-5)
  sensorId: string;
  humedad: number;       // % relativa (0–100)
  temperatura: number;   // °C
  estado: EstadoLectura;
}

export interface ResumenSensores {
  totalLecturas: number;
  humedadPromedio: number;
  temperaturaPromedio: number;
  humedadMin: number;
  humedadMax: number;
  temperaturaMin: number;
  temperaturaMax: number;
  alertas: number;
  criticos: number;
  ultimaLectura: string | null;
}

export interface SensoresFilters {
  fechaDesde: string;
  fechaHasta: string;
  estado: EstadoLectura | 'todos';
}

export interface PaginatedSensores {
  data: LecturaSensor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  resumen: ResumenSensores;
}
