export interface SensorVariable {
  id: string;
  nombre: string;
  unidad: string;
}

export interface SensorCultivo {
  id: string;
  nombre: string;
}

export interface SensorPosicion {
  lat: number;
  lng: number;
}

export interface Sensor {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  posicion?: SensorPosicion;
  activo: boolean;
  cultivo?: SensorCultivo;
  variables: SensorVariable[];
  fincaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SensorFormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  lat: string;
  lng: string;
  cultivoId: string;
  variableIds: string[];
}
