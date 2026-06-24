export interface Variable {
  id: string;
  nombre: string;
  unidad: string;
  decimales: number;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VariableFormData {
  nombre: string;
  unidad: string;
  decimales: string;
  descripcion: string;
}
