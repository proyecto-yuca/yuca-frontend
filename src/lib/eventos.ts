import type { SeveridadEvento, VariableEvento, VariableEventoFormData } from '../types/variables.types';

export const MAX_EMAILS_EVENTO = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Clases y colores por severidad (mismos tonos que el correo de alerta). */
export const SEVERIDAD_ESTILOS: Record<SeveridadEvento, {
  label: string;
  badge: string;
  dot: string;
  ring: string;
  hex: string;
  bandHex: string;
}> = {
  alerta: {
    label: 'Alerta',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    dot: 'bg-amber-500',
    ring: 'ring-amber-300 bg-amber-50 text-amber-800',
    hex: '#B54708',
    bandHex: '#F79009',
  },
  critico: {
    label: 'Crítico',
    badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    dot: 'bg-red-500',
    ring: 'ring-red-300 bg-red-50 text-red-800',
    hex: '#B42318',
    bandHex: '#F04438',
  },
};

export function validateEmail(value: string): string | null {
  return EMAIL_REGEX.test(value) ? null : `Correo inválido: ${value}`;
}

/** "40 – 80 %", "≥ 30 %", "≤ 100000 lux" o "Sin rango". */
export function formatRango(min: number | null, max: number | null, unidad: string): string {
  const u = unidad ? ` ${unidad}` : '';
  const n = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  if (min !== null && max !== null) return `${n(min)} – ${n(max)}${u}`;
  if (min !== null) return `≥ ${n(min)}${u}`;
  if (max !== null) return `≤ ${n(max)}${u}`;
  return 'Sin rango';
}

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `nuevo-${Date.now()}-${keySeq}`;
}

export function newEventoForm(nombre = ''): VariableEventoFormData {
  return {
    key: nextKey(),
    nombre,
    severidad: 'alerta',
    rangoMin: '',
    rangoMax: '',
    notificarEmail: true,
    emails: [],
    intervaloMinutos: '60',
    activo: true,
  };
}

export function eventoToForm(evento: VariableEvento): VariableEventoFormData {
  return {
    key: `evento-${evento.id}`,
    id: evento.id,
    nombre: evento.nombre,
    severidad: evento.severidad,
    rangoMin: evento.rango.min === null ? '' : String(evento.rango.min),
    rangoMax: evento.rango.max === null ? '' : String(evento.rango.max),
    notificarEmail: evento.notificaciones.email,
    emails: evento.notificaciones.emails,
    intervaloMinutos: String(evento.notificaciones.intervaloMinutos),
    activo: evento.activo,
  };
}

/** Clave de error de un campo de evento en el form: `evento.<key>.<campo>`. */
export function eventoErrorKey(key: string, campo: string) {
  return `evento.${key}.${campo}`;
}

/** Campos del backend (snake_case) → campos del form. */
const CAMPOS_BACKEND: Record<string, string> = {
  nombre: 'nombre',
  severidad: 'severidad',
  rango_min: 'rangoMin',
  rango_max: 'rangoMax',
  emails: 'emails',
  intervalo_minutos: 'intervaloMinutos',
  notificar_email: 'emails',
};

/**
 * Traduce `eventos[i].campo` del 422 al evento enviado en la posición `i`.
 * `enviados` debe ser la misma lista, en el mismo orden, que se mandó al backend.
 */
export function mapEventoApiErrors(
  fieldErrors: Record<string, string[]>,
  enviados: VariableEventoFormData[],
): Record<string, string> {
  const mapped: Record<string, string> = {};
  Object.entries(fieldErrors).forEach(([key, msgs]) => {
    const match = key.match(/^eventos\[(\d+)\]\.(\w+)$/);
    if (match) {
      const evento = enviados[Number(match[1])];
      const campo = CAMPOS_BACKEND[match[2]] ?? 'nombre';
      if (evento) mapped[eventoErrorKey(evento.key, campo)] = msgs[0];
    } else if (key === 'eventos') {
      mapped.eventos = msgs[0];
    } else {
      mapped[key] = msgs[0];
    }
  });
  return mapped;
}

function parseNum(value: string): number | null | 'invalid' {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 'invalid';
}

export function validateEventos(eventos: VariableEventoFormData[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const vivos = eventos.filter(e => !e.eliminado);

  vivos.forEach(e => {
    const k = (campo: string) => eventoErrorKey(e.key, campo);
    if (!e.nombre.trim()) errors[k('nombre')] = 'El nombre es requerido';

    const min = parseNum(e.rangoMin);
    const max = parseNum(e.rangoMax);
    if (min === 'invalid') errors[k('rangoMin')] = 'Número inválido';
    if (max === 'invalid') errors[k('rangoMax')] = 'Número inválido';
    if (min === null && max === null) errors[k('rangoMin')] = 'Define un mínimo, un máximo o ambos';
    if (typeof min === 'number' && typeof max === 'number' && min >= max) {
      errors[k('rangoMin')] = 'Debe ser menor que el máximo';
    }

    const intervalo = Number(e.intervaloMinutos);
    if (!Number.isInteger(intervalo) || intervalo < 1) errors[k('intervaloMinutos')] = 'Mínimo 1 minuto';

    if (e.notificarEmail && e.emails.length === 0) errors[k('emails')] = 'Agrega al menos un correo';
    if (e.emails.length > MAX_EMAILS_EVENTO) errors[k('emails')] = `Máximo ${MAX_EMAILS_EVENTO} correos`;
  });

  const nombres = vivos.map(e => e.nombre.trim().toLowerCase()).filter(Boolean);
  vivos.forEach(e => {
    const n = e.nombre.trim().toLowerCase();
    if (n && nombres.filter(x => x === n).length > 1) {
      errors[eventoErrorKey(e.key, 'nombre')] = 'Ya hay otro evento con este nombre';
    }
  });

  return errors;
}

