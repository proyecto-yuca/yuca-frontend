import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { TagListInput } from '../../components/ui/TagListInput';
import {
  MAX_EMAILS_EVENTO,
  SEVERIDAD_ESTILOS,
  eventoErrorKey,
  formatRango,
  validateEmail,
} from '../../lib/eventos';
import type { SeveridadEvento, VariableEventoFormData } from '../../types/variables.types';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2',
          checked ? 'bg-forest-600' : 'bg-slate-300',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
    </label>
  );
}

function parseOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

interface VariableEventoCardProps {
  evento: VariableEventoFormData;
  unidad: string;
  errors: Record<string, string>;
  defaultOpen?: boolean;
  onChange: (evento: VariableEventoFormData) => void;
  onRemove: () => void;
}

export function VariableEventoCard({ evento, unidad, errors, defaultOpen = false, onChange, onRemove }: VariableEventoCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const err = (campo: string) => errors[eventoErrorKey(evento.key, campo)];
  const hasErrors = Object.keys(errors).some(k => k.startsWith(`evento.${evento.key}.`));
  const expanded = open || hasErrors;

  const estilo = SEVERIDAD_ESTILOS[evento.severidad];
  const rango = formatRango(parseOrNull(evento.rangoMin), parseOrNull(evento.rangoMax), unidad);
  const set = <K extends keyof VariableEventoFormData>(campo: K, value: VariableEventoFormData[K]) =>
    onChange({ ...evento, [campo]: value });

  return (
    <div
      data-has-error={hasErrors}
      className={[
        'overflow-hidden rounded-xl border bg-white shadow-sm transition-colors',
        hasErrors ? 'border-red-200' : 'border-slate-200',
        evento.activo ? '' : 'opacity-75',
      ].join(' ')}
    >
      <div className="flex">
        <div className={`w-1 shrink-0 ${estilo.dot}`} aria-hidden />

        <div className="min-w-0 flex-1">
          {/* Encabezado */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-expanded={expanded}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="truncate text-sm font-semibold text-slate-900">
                {evento.nombre.trim() || <span className="font-normal italic text-slate-400">Nuevo evento</span>}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${estilo.badge}`}>
                {estilo.label}
              </span>
              <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">{rango}</span>
              {evento.notificarEmail && (
                <span className="hidden shrink-0 items-center gap-1 text-xs text-slate-500 sm:inline-flex" title="Correos">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {evento.emails.length}
                </span>
              )}
              {!evento.activo && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Inactivo</span>
              )}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              aria-label="Eliminar evento"
              title="Eliminar evento"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Cuerpo */}
          {expanded && (
            <div className="space-y-4 border-t border-slate-100 px-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  label="Nombre del evento *"
                  value={evento.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  error={err('nombre')}
                  placeholder="Ej: Humedad crítica"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-700">Severidad</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(['alerta', 'critico'] as SeveridadEvento[]).map(sev => {
                      const activo = evento.severidad === sev;
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => set('severidad', sev)}
                          className={[
                            'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            activo ? `ring-1 ${SEVERIDAD_ESTILOS[sev].ring} shadow-sm` : 'text-slate-500 hover:text-slate-700',
                          ].join(' ')}
                        >
                          <span className={`h-2 w-2 rounded-full ${SEVERIDAD_ESTILOS[sev].dot}`} />
                          {SEVERIDAD_ESTILOS[sev].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={`Mínimo${unidad ? ` (${unidad})` : ''}`}
                    inputMode="decimal"
                    value={evento.rangoMin}
                    onChange={e => set('rangoMin', e.target.value)}
                    error={err('rangoMin')}
                    placeholder="Sin mínimo"
                  />
                  <Input
                    label={`Máximo${unidad ? ` (${unidad})` : ''}`}
                    inputMode="decimal"
                    value={evento.rangoMax}
                    onChange={e => set('rangoMax', e.target.value)}
                    error={err('rangoMax')}
                    placeholder="Sin máximo"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Rango permitido: <span className="font-medium text-slate-600">{rango}</span>. El evento se dispara cuando una lectura queda fuera.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <Switch
                  checked={evento.notificarEmail}
                  onChange={checked => set('notificarEmail', checked)}
                  label="Enviar correo"
                  description="Se avisa a esta lista cuando una lectura sale del rango."
                />
                {evento.notificarEmail && (
                  <>
                    <TagListInput
                      values={evento.emails}
                      onChange={emails => set('emails', emails)}
                      placeholder="agronomo@finca.com"
                      max={MAX_EMAILS_EVENTO}
                      normalize={v => v.trim().toLowerCase()}
                      validate={validateEmail}
                      error={err('emails')}
                    />
                    <div className="max-w-[16rem]">
                      <Input
                        label="Intervalo mínimo entre correos (min)"
                        type="number"
                        min="1"
                        value={evento.intervaloMinutos}
                        onChange={e => set('intervaloMinutos', e.target.value)}
                        error={err('intervaloMinutos')}
                        hint="Por sensor, para no repetir avisos."
                      />
                    </div>
                  </>
                )}
              </div>

              <Switch
                checked={evento.activo}
                onChange={checked => set('activo', checked)}
                label="Evento activo"
                description="Si está inactivo no marca lecturas ni envía correos."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
