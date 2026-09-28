import privateClient from '../api/privateClient';
import { isApiError } from '../api/ApiError';
import type { Variable, VariableEventoFormData, VariableFormData } from '../../types/variables.types';

function toNumberOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value.replace(',', '.'));
}

function buildEventoAttributes(evento: VariableEventoFormData) {
  if (evento.eliminado) return { id: evento.id, _destroy: true };
  return {
    id: evento.id,
    nombre: evento.nombre.trim(),
    severidad: evento.severidad,
    rango_min: toNumberOrNull(evento.rangoMin),
    rango_max: toNumberOrNull(evento.rangoMax),
    notificar_email: evento.notificarEmail,
    emails: evento.emails,
    intervalo_minutos: parseInt(evento.intervaloMinutos, 10),
    activo: evento.activo,
  };
}

/**
 * El backend indexa los errores de eventos (`eventos[i].campo`) por la posición en la
 * colección de la variable: primero los existentes en el orden en que llegaron, luego los
 * nuevos. Por eso se envía la lista completa en ese mismo orden (ver `orderEventosForSubmit`).
 */
export function orderEventosForSubmit(eventos: VariableEventoFormData[]): VariableEventoFormData[] {
  // Los eliminados nuevos nunca llegaron al servidor: no se envían.
  const enviados = eventos.filter(e => !(e.eliminado && !e.id));
  return [...enviados.filter(e => e.id), ...enviados.filter(e => !e.id)];
}

function buildBody(formData: VariableFormData) {
  return {
    variable: {
      nombre: formData.nombre,
      unidad: formData.unidad,
      decimales: parseInt(formData.decimales, 10),
      descripcion: formData.descripcion || undefined,
      eventos_attributes: orderEventosForSubmit(formData.eventos).map(buildEventoAttributes),
    },
  };
}

const variablesService = {
  async getAll(): Promise<Variable[]> {
    const response = await privateClient.get<Variable[]>('/variables');
    return response.data;
  },

  async getById(id: string): Promise<Variable | null> {
    try {
      const response = await privateClient.get<Variable>(`/variables/${id}`);
      return response.data;
    } catch (error) {
      if (isApiError(error) && error.statusCode === 404) return null;
      throw error;
    }
  },

  async create(formData: VariableFormData): Promise<Variable> {
    const response = await privateClient.post<Variable>('/variables', buildBody(formData));
    return response.data;
  },

  async update(id: string, formData: VariableFormData): Promise<Variable> {
    const response = await privateClient.patch<Variable>(`/variables/${id}`, buildBody(formData));
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await privateClient.delete(`/variables/${id}`);
  },
};

export default variablesService;
