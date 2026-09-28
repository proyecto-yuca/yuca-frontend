import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import alertasService from '../../services/alertas/alertasService';
import { isApiError } from '../../services/api/ApiError';
import { SEVERIDAD_ESTILOS, formatRango } from '../../lib/eventos';
import type { Alerta } from '../../types/alertas.types';
import type { SeveridadEvento } from '../../types/variables.types';
import type { Sensor } from '../../types/sensor.types';

interface AlertasPanelProps {
  fincaId: string;
  sensores: Sensor[];
}

const PAGE_SIZE = 15;

function EnvioCell({ alerta }: { alerta: Alerta }) {
  const { envio } = alerta;
  if (envio.enviadoAt) {
    return (
      <span
        title={envio.emails.join(', ')}
        className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700 ring-1 ring-inset ring-forest-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Enviado a {envio.emails.length} {envio.emails.length === 1 ? 'correo' : 'correos'}
      </span>
    );
  }
  if (envio.error) {
    return (
      <span title={envio.error} className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
        Error al enviar
      </span>
    );
  }
  const motivo: Record<string, string> = {
    intervalo: 'Omitido por intervalo',
    sin_correo: 'Sin correo',
    sin_destinatarios: 'Sin destinatarios',
  };
  if (envio.omitido && envio.motivoOmision) {
    return <span className="text-xs text-slate-400">{motivo[envio.motivoOmision]}</span>;
  }
  return <span className="text-xs text-slate-400">Pendiente…</span>;
}

export function AlertasPanel({ fincaId, sensores }: AlertasPanelProps) {
  const [severidad, setSeveridad] = useState<SeveridadEvento | ''>('');
  const [sensorId, setSensorId] = useState('');
  const [variableId, setVariableId] = useState('');
  const [page, setPage] = useState(1);

  // La respuesta guarda la consulta que la originó; si no coincide con la actual, está cargando.
  const consulta = JSON.stringify([fincaId, severidad, sensorId, variableId, page]);
  const [respuesta, setRespuesta] = useState<{
    consulta: string;
    alertas: Alerta[];
    total: number;
    totalPages: number;
    error: string | null;
  } | null>(null);
  const loading = respuesta?.consulta !== consulta;
  const alertas = respuesta?.alertas ?? [];
  const total = respuesta?.total ?? 0;
  const totalPages = respuesta?.totalPages ?? 1;
  const error = loading ? null : respuesta?.error ?? null;

  const variables = useMemo(() => {
    const map = new Map<string, string>();
    sensores.forEach(s => s.variables.forEach(v => map.set(v.id, v.nombre)));
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [sensores]);

  useEffect(() => {
    let cancelled = false;
    alertasService
      .getAll(fincaId, { severidad, sensorId, variableId }, page, PAGE_SIZE)
      .then(result => {
        if (cancelled) return;
        setRespuesta({ consulta, alertas: result.data, total: result.total, totalPages: result.totalPages, error: null });
      })
      .catch(err => {
        if (cancelled) return;
        const message = isApiError(err) ? err.message : 'Error al cargar las alertas.';
        setRespuesta({ consulta, alertas: [], total: 0, totalPages: 1, error: message });
      });
    return () => { cancelled = true; };
  }, [consulta, fincaId, severidad, sensorId, variableId, page]);

  const selectClass =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-400';

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Alertas de la finca</h3>
          <p className="text-xs text-slate-400">Lecturas que salieron del rango de algún evento y el estado de su correo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {([['', 'Todas'], ['alerta', 'Alerta'], ['critico', 'Crítico']] as const).map(([value, label]) => (
              <button
                key={value || 'todas'}
                type="button"
                onClick={() => resetPage(setSeveridad)(value)}
                className={[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  severidad === value ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {value && <span className={`h-1.5 w-1.5 rounded-full ${SEVERIDAD_ESTILOS[value].dot}`} />}
                {label}
              </button>
            ))}
          </div>
          <select value={variableId} onChange={e => resetPage(setVariableId)(e.target.value)} className={selectClass}>
            <option value="">Todas las variables</option>
            {variables.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
          <select value={sensorId} onChange={e => resetPage(setSensorId)(e.target.value)} className={selectClass}>
            <option value="">Todos los sensores</option>
            {sensores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!error && (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    {['Evento', 'Valor', 'Rango permitido', 'Sensor', 'Fecha', 'Correo'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 ${i === 1 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">Cargando…</td></tr>
                  ) : alertas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center">
                        <p className="text-sm font-medium text-slate-600">Sin alertas</p>
                        <p className="text-xs text-slate-400">Ninguna lectura ha salido de los rangos configurados.</p>
                      </td>
                    </tr>
                  ) : (
                    alertas.map(a => {
                      const estilo = SEVERIDAD_ESTILOS[a.severidad];
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${estilo.badge}`}>{estilo.label}</span>
                              <span className="text-sm font-medium text-slate-900">{a.evento.nombre}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">{a.variable.nombre}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <span className="text-sm font-semibold" style={{ color: estilo.hex }}>
                              {a.tipo === 'alto' ? '▲' : '▼'} {a.valor}
                            </span>{' '}
                            <span className="text-xs text-slate-400">{a.variable.unidad}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-500 whitespace-nowrap">
                            {formatRango(a.rango.min, a.rango.max, a.variable.unidad)}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-sm text-slate-700">{a.sensor.nombre}</p>
                            <p className="text-xs text-slate-400">{a.cultivo?.nombre ?? 'Sin cultivo'} · <span className="font-mono">{a.sensor.codigo}</span></p>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{a.fecha} {a.horaRegistro}</td>
                          <td className="px-4 py-2.5"><EnvioCell alerta={a} /></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">{total} {total === 1 ? 'alerta' : 'alertas'}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-slate-400">Página {page} de {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
