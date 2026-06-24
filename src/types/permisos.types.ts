export interface Rol {
  id: string;
  identificador: string;
  nombre: string;
  descripcion?: string;
  sistema: boolean;
  usuarios: number;
  createdAt: string;
  updatedAt: string;
}

export interface RolFormData {
  identificador: string;
  nombre: string;
  descripcion: string;
}

export interface Modulo {
  id: string;
  identificador: string;
  nombre: string;
  orden: number;
}

export interface PermisoModulo {
  moduloId: string;
  identificador: string;
  nombre: string;
  orden: number;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}
