export type SeveridadEvento = 'alerta' | 'critico';

export interface RangoEvento {
  min: number | null;
  max: number | null;
}

export interface VariableEvento {
  id: string;
  nombre: string;
  severidad: SeveridadEvento;
  rango: RangoEvento;
  notificaciones: {
    email: boolean;
    emails: string[];
    intervaloMinutos: number;
  };
  activo: boolean;
}

export interface Variable {
  id: string;
  nombre: string;
  unidad: string;
  decimales: number;
  descripcion?: string;
  eventos: VariableEvento[];
  createdAt: string;
  updatedAt: string;
}

export interface VariableEventoFormData {
  /** Clave estable para React; los eventos nuevos no tienen `id`. */
  key: string;
  id?: string;
  nombre: string;
  severidad: SeveridadEvento;
  rangoMin: string;
  rangoMax: string;
  notificarEmail: boolean;
  emails: string[];
  intervaloMinutos: string;
  activo: boolean;
  /** Eventos existentes que el usuario quitó: se envían con `_destroy`. */
  eliminado?: boolean;
}

export interface VariableFormData {
  nombre: string;
  unidad: string;
  decimales: string;
  descripcion: string;
  eventos: VariableEventoFormData[];
}
