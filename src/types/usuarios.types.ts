export interface UsuarioRol {
  id: string;
  identificador: string;
  nombre: string;
}

export interface Usuario {
  id: string;
  name: string;
  email: string;
  estado: boolean;
  rol: UsuarioRol;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioFormData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  rol_id: string;
}
