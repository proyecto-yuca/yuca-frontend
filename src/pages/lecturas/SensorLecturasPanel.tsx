import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import lecturasService from '../../services/lecturas/lecturasService';
import { isApiError } from '../../services/api/ApiError';
import type { Sensor } from '../../types/sensor.types';
import type { Lectura } from '../../types/lecturas.types';

interface SensorLecturasPanelProps {
  fincaId: string;
  sensor: Sensor;
}

const PAGE_SIZE = 20;

interface ChartPoint {
  label: string;
  valor: number;
}

function CustomTooltip({ active, payload, unidad }: { active?: boolean; payload?: { payload: ChartPoint }[]; unidad: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400">{point.label}</p>
      <p className="font-semibold text-slate-900">{point.valor} {unidad}</p>
    </div>
  );
}

export function SensorLecturasPanel({ fincaId, sensor }: SensorLecturasPanelProps) {
  const [activeVariableId, setActiveVariableId] = useState(sensor.variables[0]?.id ?? '');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
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
  }, [activeVariableId, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (!activeVariableId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    lecturasService
      .getAll(fincaId, sensor.id, { variableId: activeVariableId, fechaDesde, fechaHasta }, page, PAGE_SIZE)
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
  }, [fincaId, sensor.id, activeVariableId, fechaDesde, fechaHasta, page]);

  const activeVariable = sensor.variables.find(v => v.id === activeVariableId);

  const chartData: ChartPoint[] = useMemo(
    () =>
      [...lecturas]
        .reverse()
        .map(l => ({ label: `${l.fecha} ${l.horaRegistro}`, valor: l.valor })),
    [lecturas],
  );

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
            <div className="mb-2 text-xs font-medium text-slate-500">
              {activeVariable ? `${activeVariable.nombre} (${activeVariable.unidad})` : ''}
            </div>
            <div style={{ height: 220 }}>
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  {loading ? 'Cargando…' : 'Sin lecturas en el rango seleccionado.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      minTickGap={40}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip content={<CustomTooltip unidad={activeVariable?.unidad ?? ''} />} />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="#2E632B"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#2E632B', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-400">Cargando…</td></tr>
                  ) : lecturas.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-400">Sin lecturas registradas.</td></tr>
                  ) : (
                    lecturas.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-sm text-slate-700">{l.fecha}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-500 font-mono">{l.horaRegistro}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                          {l.valor} <span className="text-slate-400">{l.variable.unidad}</span>
                        </td>
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
