export interface PuntoUbicacion {
  lat: number;
  lng: number;
}

export interface Cultivo {
  id: string;
  nombre: string;
  descripcion?: string;
  puntosUbicacion: PuntoUbicacion[];
  fincaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultivoFormData {
  nombre: string;
  descripcion: string;
  puntosUbicacion: { lat: string; lng: string }[];
}
