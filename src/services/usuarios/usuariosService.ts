import privateClient from '../api/privateClient';
import type { Usuario, UsuarioFormData } from '../../types/usuarios.types';

const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    const response = await privateClient.get<Usuario[]>('/usuarios');
    return response.data;
  },

  async create(formData: UsuarioFormData): Promise<Usuario> {
    const response = await privateClient.post<Usuario>('/usuarios', {
      usuario: {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        rol_id: parseInt(formData.rol_id, 10),
      },
    });
    return response.data;
  },

  async update(id: string, formData: UsuarioFormData): Promise<Usuario> {
    const response = await privateClient.patch<Usuario>(`/usuarios/${id}`, {
      usuario: {
        name: formData.name,
        email: formData.email,
        rol_id: parseInt(formData.rol_id, 10),
      },
    });
    return response.data;
  },

  async changePassword(id: string, password: string, passwordConfirmation: string): Promise<void> {
    await privateClient.patch(`/usuarios/${id}/cambiar_password`, {
      password,
      confirmation_password: passwordConfirmation,
    });
  },

  async toggle(id: string): Promise<Usuario> {
    const response = await privateClient.patch<Usuario>(`/usuarios/${id}/toggle_estado`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await privateClient.delete(`/usuarios/${id}`);
  },
};

export default usuariosService;
