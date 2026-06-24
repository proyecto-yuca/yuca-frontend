import privateClient from '../api/privateClient';
import type { Modulo, PermisoModulo } from '../../types/permisos.types';

export interface PermisoInput {
  modulo_id: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

const permisosService = {
  async getModulos(): Promise<Modulo[]> {
    const response = await privateClient.get<Modulo[]>('/modulos');
    return response.data;
  },

  async getPermisosByRol(rolId: string): Promise<PermisoModulo[]> {
    const response = await privateClient.get<PermisoModulo[]>(`/roles/${rolId}/permisos`);
    return response.data;
  },

  async updatePermisos(rolId: string, permisos: PermisoInput[]): Promise<void> {
    await privateClient.put(`/roles/${rolId}/permisos`, { permisos });
  },
};

export default permisosService;
