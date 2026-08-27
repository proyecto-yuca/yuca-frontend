import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { FincaSelector } from '../../components/selectors/FincaSelector';
import { Tabs } from '../../components/ui/Tabs';
import fincasService from '../../services/fincas/fincasService';
import cultivosService from '../../services/cultivos/cultivosService';
import sensorService from '../../services/sensores/sensorService';
import dashboardStatsService, {
  type LecturaConFinca,
  type LecturasPorDia,
} from '../../services/dashboard/dashboardStatsService';
import type { Finca } from '../../types/fincas.types';
import type { Cultivo } from '../../types/cultivos.types';
import type { Sensor } from '../../types/sensor.types';
import { SensorLecturasPanel } from './SensorLecturasPanel';

// ── Resumen tab ────────────────────────────────────────────────────────────────

interface LecturasResumenProps {
  fincaId: string;
  fincaNombre: string;
  sensores: Sensor[];
}

function LecturasResumen({ fincaId, fincaNombre, sensores }: LecturasResumenProps) {
  const [loading, setLoading] = useState(true);
  const [ultimas, setUltimas] = useState<LecturaConFinca[]>([]);
  const [lecturasHoy, setLecturasHoy] = useState(0);
  const [porDia, setPorDia] = useState<LecturasPorDia[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      dashboardStatsService.getUltimasLecturasSensores(fincaId, fincaNombre, sensores, 5),
      dashboardStatsService.contarLecturasHoy(fincaId, sensores),
      dashboardStatsService.getLecturasPorDia(fincaId, sensores, 7),
    ])
      .then(([ultimasData, hoyCount, porDiaData]) => {
        if (cancelled) return;
        setUltimas(ultimasData.slice(0, 8));
        setLecturasHoy(hoyCount);
        setPorDia(porDiaData);
      })
      .catch(() => {
        if (cancelled) return;
        setUltimas([]);
        setLecturasHoy(0);
        setPorDia([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fincaId, fincaNombre, sensores]);

  const porDiaConLabel = porDia.map((d) => ({
    ...d,
    label: new Date(`${d.fecha}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
  }));

  const sensoresConLectura = new Set(ultimas.map(l => l.sensor.id)).size;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Cargando resumen…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sensores con lecturas hoy', value: sensoresConLectura, color: 'text-forest-700' },
          { label: 'Lecturas registradas hoy', value: lecturasHoy, color: 'text-emerald-700' },
          { label: 'Última lectura', value: ultimas[0] ? `${ultimas[0].fecha} ${ultimas[0].horaRegistro}` : '—', color: 'text-earth-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Lecturas por día (últimos 7 días)</h3>
        {porDiaConLabel.every((d) => d.cantidad === 0) ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin lecturas en los últimos 7 días.</p>
        ) : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={porDiaConLabel} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="cantidad" name="Lecturas" stroke="#2E632B" fill="#2E632B" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Últimas lecturas de la finca</h3>
        </div>
        {ultimas.length === 0 ? (
          <p className="px-4 sm:px-5 py-8 text-center text-sm text-slate-400">Sin lecturas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sensor</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Variable</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Valor</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ultimas.map(l => (
                  <tr key={`${l.sensor.id}-${l.id}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-slate-700">{l.sensor.nombre}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{l.variable.nombre}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                      {l.valor} <span className="text-slate-400">{l.variable.unidad}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400">{l.fecha} {l.horaRegistro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function LecturasPage() {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [selectedFinca, setSelectedFinca] = useState<Finca | null>(null);
  const [loadingFincas, setLoadingFincas] = useState(true);

  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [selectedCultivoId, setSelectedCultivoId] = useState('');
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [loadingContenido, setLoadingContenido] = useState(false);

  const [selectedSensorId, setSelectedSensorId] = useState('');

  const [view, setView] = useState<'listado' | 'resumen'>('listado');

  useEffect(() => {
    let cancelled = false;
    setLoadingFincas(true);
    fincasService
      .getAll({ search: '', estado: 'todos' }, 1, 100)
      .then(result => {
        if (cancelled) return;
        setFincas(result.data);
        if (result.data.length > 0) setSelectedFinca(result.data[0]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingFincas(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedFinca) return;
    let cancelled = false;
    setLoadingContenido(true);
    setSelectedCultivoId('');
    setSelectedSensorId('');
    Promise.all([
      cultivosService.getAll(selectedFinca.id),
      sensorService.getAll(selectedFinca.id),
    ])
      .then(([cultivosData, sensoresData]) => {
        if (cancelled) return;
        setCultivos(cultivosData);
        setSensores(sensoresData);
        if (cultivosData.length > 0) setSelectedCultivoId(cultivosData[0].id);
      })
      .catch(() => {
        if (cancelled) return;
        setCultivos([]);
        setSensores([]);
      })
      .finally(() => { if (!cancelled) setLoadingContenido(false); });
    return () => { cancelled = true; };
  }, [selectedFinca]);

  const sensoresDelCultivo = sensores.filter(s => s.cultivo?.id === selectedCultivoId);
  const selectedSensor = sensoresDelCultivo.find(s => s.id === selectedSensorId) ?? null;

  return (
    <DashboardLayout pageTitle="Lectura">
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Lectura</h2>
          <p className="text-sm text-slate-500 mt-0.5">Consulta las lecturas de los sensores por cultivo</p>
        </div>

        {/* Finca selector */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-medium text-slate-600 shrink-0">Finca:</span>
          <FincaSelector
            fincas={fincas}
            selected={selectedFinca}
            loading={loadingFincas}
            onSelect={setSelectedFinca}
          />
        </div>

        {!loadingFincas && fincas.length === 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              No tienes fincas registradas.{' '}
              <a href="/dashboard/fincas" className="text-forest-600 font-medium hover:underline">
                Crea una finca primero.
              </a>
            </p>
          </div>
        )}

        {selectedFinca && (
          <div className="mb-5">
            <Tabs
              tabs={[
                { value: 'listado', label: 'Listado' },
                { value: 'resumen', label: 'Resumen' },
              ]}
              active={view}
              onChange={setView}
            />
          </div>
        )}

        {selectedFinca && view === 'resumen' && (
          <LecturasResumen fincaId={selectedFinca.id} fincaNombre={selectedFinca.nombre} sensores={sensores} />
        )}

        {selectedFinca && view === 'listado' && (
          <>
            {/* Cultivo selector */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-slate-600 shrink-0">Cultivo:</span>
              {loadingContenido ? (
                <span className="text-sm text-slate-400">Cargando cultivos…</span>
              ) : cultivos.length === 0 ? (
                <span className="text-sm text-slate-400">
                  Esta finca no tiene cultivos registrados.{' '}
                  <a href="/dashboard/cultivos" className="text-forest-600 font-medium hover:underline">
                    Crear cultivo
                  </a>
                </span>
              ) : (
                <select
                  value={selectedCultivoId}
                  onChange={e => { setSelectedCultivoId(e.target.value); setSelectedSensorId(''); }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                  style={{ minWidth: '220px' }}
                >
                  {cultivos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Sensores del cultivo */}
            {!loadingContenido && selectedCultivoId && (
              <>
                {sensoresDelCultivo.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400 mb-5">
                    Este cultivo no tiene sensores asignados.
                  </div>
                ) : (
                  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sensoresDelCultivo.map(sensor => (
                      <button
                        key={sensor.id}
                        type="button"
                        onClick={() => setSelectedSensorId(sensor.id)}
                        className={[
                          'rounded-xl border p-4 text-left transition-colors',
                          sensor.id === selectedSensorId
                            ? 'border-forest-400 bg-forest-50/60 ring-1 ring-forest-400'
                            : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm',
                        ].join(' ')}
                      >
                        <p className="text-sm font-semibold text-slate-900">{sensor.nombre}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{sensor.codigo}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sensor.variables.map(v => (
                            <span key={v.id} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {v.nombre}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedSensor && (
                  <SensorLecturasPanel fincaId={selectedFinca.id} sensor={selectedSensor} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
