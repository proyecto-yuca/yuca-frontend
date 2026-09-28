import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import lecturasService from '../../services/lecturas/lecturasService';
import { isApiError } from '../../services/api/ApiError';
import type { Sensor } from '../../types/sensor.types';
import type { EstadoLectura, Lectura, LecturaRango } from '../../types/lecturas.types';
import { SEVERIDAD_ESTILOS } from '../../lib/eventos';

interface SensorLecturasPanelProps {
  fincaId: string;
  sensor: Sensor;
}

const PAGE_SIZE = 20;

interface ChartPoint {
  label: string;
  valor: number;
  estado: EstadoLectura | null;
  eventos: string[];
}

const COLOR_NORMAL = '#2E632B';

function colorEstado(estado: EstadoLectura | null) {
  return estado === 'alerta' || estado === 'critico' ? SEVERIDAD_ESTILOS[estado].hex : COLOR_NORMAL;
}

function EstadoBadge({ lectura }: { lectura: Lectura }) {
  if (lectura.estado === null) return <span className="text-xs text-slate-300">—</span>;
  if (lectura.estado === 'normal') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700 ring-1 ring-inset ring-forest-100">
        <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />Normal
      </span>
    );
  }
  const estilo = SEVERIDAD_ESTILOS[lectura.estado];
  const detalle = lectura.eventos.map(e => `${e.nombre} (${e.tipo === 'alto' ? 'por encima' : 'por debajo'})`).join(' · ');
  return (
    <span title={detalle} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${estilo.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${estilo.dot}`} />
      {estilo.label}
      <span className="font-normal">{lectura.eventos.some(e => e.tipo === 'alto') ? '▲' : '▼'}</span>
    </span>
  );
}

function CustomTooltip({ active, payload, unidad }: { active?: boolean; payload?: { payload: ChartPoint }[]; unidad: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400">{point.label}</p>
      <p className="font-semibold" style={{ color: colorEstado(point.estado) }}>{point.valor} {unidad}</p>
      {point.eventos.length > 0 && <p className="mt-0.5 max-w-[14rem] text-slate-500">{point.eventos.join(' · ')}</p>}
    </div>
  );
}

function PuntoLectura(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const fuera = payload.estado === 'alerta' || payload.estado === 'critico';
  return (
    <circle
      cx={cx}
      cy={cy}
      r={fuera ? 4.5 : 3}
      fill={colorEstado(payload.estado)}
      stroke={fuera ? '#ffffff' : 'none'}
      strokeWidth={fuera ? 1.5 : 0}
    />
  );
}

/** Zona que cumple todos los rangos a la vez (la más estricta), para sombrearla en verde. */
function zonaOptima(rangos: LecturaRango[]) {
  const mins = rangos.map(r => r.min).filter((v): v is number => v !== null);
  const maxs = rangos.map(r => r.max).filter((v): v is number => v !== null);
  const y1 = mins.length ? Math.max(...mins) : undefined;
  const y2 = maxs.length ? Math.min(...maxs) : undefined;
  if (y1 !== undefined && y2 !== undefined && y1 >= y2) return null;
  return { y1, y2 };
}

export function SensorLecturasPanel({ fincaId, sensor }: SensorLecturasPanelProps) {
  const [activeVariableId, setActiveVariableId] = useState(sensor.variables[0]?.id ?? '');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [soloFuera, setSoloFuera] = useState(false);
  const [page, setPage] = useState(1);

  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveVariableId(sensor.variables[0]?.id ?? '');
    setPage(1);
  }, [sensor.id, sensor.variables]);

  useEffect(() => {
    setPage(1);
  }, [activeVariableId, fechaDesde, fechaHasta, soloFuera]);

  useEffect(() => {
    if (!activeVariableId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    lecturasService
      .getAll(fincaId, sensor.id, { variableId: activeVariableId, fechaDesde, fechaHasta, soloFueraDeRango: soloFuera }, page, PAGE_SIZE)
      .then(result => {
        if (cancelled) return;
        setLecturas(result.data);
        setTotalPages(result.totalPages);
      })
      .catch(err => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : 'Error al cargar las lecturas.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fincaId, sensor.id, activeVariableId, fechaDesde, fechaHasta, soloFuera, page]);

  const activeVariable = sensor.variables.find(v => v.id === activeVariableId);

  const chartData: ChartPoint[] = useMemo(
    () =>
      [...lecturas]
        .reverse()
        .map(l => ({
          label: `${l.fecha} ${l.horaRegistro}`,
          valor: l.valor,
          estado: l.estado,
          eventos: l.eventos.map(e => e.nombre),
        })),
    [lecturas],
  );

  const rangos = useMemo(() => lecturas[0]?.variable.rangos ?? [], [lecturas]);
  const optima = useMemo(() => zonaOptima(rangos), [rangos]);

  // El eje Y incluye los límites de los eventos para que sus líneas siempre se vean.
  const yDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0) return undefined;
    const valores = [
      ...chartData.map(p => p.valor),
      ...rangos.flatMap(r => [r.min, r.max]).filter((v): v is number => v !== null),
    ];
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const pad = (max - min || Math.abs(max) || 1) * 0.08;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [chartData, rangos]);

  if (sensor.variables.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
        Este sensor no tiene variables asignadas.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
      {/* Header + variable tabs */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{sensor.nombre}</h3>
          <p className="text-xs text-slate-400 font-mono">{sensor.codigo}</p>
        </div>
        {sensor.variables.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sensor.variables.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVariableId(v.id)}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  v.id === activeVariableId
                    ? 'bg-forest-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {v.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-44">
          <Input label="Desde" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="w-full sm:w-44">
          <Input label="Hasta" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 sm:mb-2.5">
          <input
            type="checkbox"
            checked={soloFuera}
            onChange={e => setSoloFuera(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-forest-600 focus:ring-forest-500"
          />
          Solo fuera de rango
        </label>
        {(fechaDesde || fechaHasta) && (
          <button
            type="button"
            onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 sm:mb-2.5"
          >
            Limpiar fechas
          </button>
        )}
      </div>

      <div className="p-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!error && (
          <>
            {/* Chart */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                {activeVariable ? `${activeVariable.nombre} (${activeVariable.unidad})` : ''}
              </span>
              {rangos.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  {optima && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-4 rounded-sm bg-forest-100 ring-1 ring-inset ring-forest-200" />Zona óptima
                    </span>
                  )}
                  {rangos.map(r => (
                    <span key={r.eventoId} className="inline-flex items-center gap-1.5">
                      <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: SEVERIDAD_ESTILOS[r.severidad].bandHex }} />
                      {r.nombre}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: 220 }}>
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  {loading ? 'Cargando…' : 'Sin lecturas en el rango seleccionado.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      domain={yDomain ?? ['auto', 'auto']}
                      allowDataOverflow
                    />
                    {optima && (
                      <ReferenceArea y1={optima.y1} y2={optima.y2} fill="#d4e9d3" fillOpacity={0.45} stroke="none" ifOverflow="extendDomain" />
                    )}
                    {rangos.flatMap(r =>
                      ([['min', r.min], ['max', r.max]] as const)
                        .filter(([, v]) => v !== null)
                        .map(([lado, v]) => (
                          <ReferenceLine
                            key={`${r.eventoId}-${lado}`}
                            y={v as number}
                            stroke={SEVERIDAD_ESTILOS[r.severidad].bandHex}
                            strokeDasharray="5 4"
                            strokeWidth={1.25}
                            ifOverflow="extendDomain"
                            label={{
                              value: `${lado === 'min' ? 'mín' : 'máx'} ${v}`,
                              position: 'insideTopRight',
                              fontSize: 10,
                              fill: SEVERIDAD_ESTILOS[r.severidad].hex,
                            }}
                          />
                        )),
                    )}
                    <Tooltip content={<CustomTooltip unidad={activeVariable?.unidad ?? ''} />} />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke={COLOR_NORMAL}
                      strokeWidth={2}
                      dot={<PuntoLectura />}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Table */}
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Fecha</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Hora</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Valor</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">Cargando…</td></tr>
                  ) : lecturas.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                      {soloFuera ? 'No hay lecturas fuera de rango.' : 'Sin lecturas registradas.'}
                    </td></tr>
                  ) : (
                    lecturas.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-sm text-slate-700">{l.fecha}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-500 font-mono">{l.horaRegistro}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                          <span style={{ color: l.estado === 'alerta' || l.estado === 'critico' ? colorEstado(l.estado) : undefined }}>
                            {l.valor}
                          </span>{' '}
                          <span className="text-slate-400">{l.variable.unidad}</span>
                        </td>
                        <td className="px-4 py-2.5"><EstadoBadge lectura={l} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-end gap-2">
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
          </>
        )}
      </div>
    </div>
  );
}
