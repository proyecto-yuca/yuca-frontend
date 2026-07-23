import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { FincaSelector } from '../../components/selectors/FincaSelector';
import fincasService from '../../services/fincas/fincasService';
import cultivosService from '../../services/cultivos/cultivosService';
import sensorService from '../../services/sensores/sensorService';
import type { Finca } from '../../types/fincas.types';
import type { Cultivo } from '../../types/cultivos.types';
import type { Sensor } from '../../types/sensor.types';
import { SensorLecturasPanel } from './SensorLecturasPanel';

export function LecturasPage() {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [selectedFinca, setSelectedFinca] = useState<Finca | null>(null);
  const [loadingFincas, setLoadingFincas] = useState(true);

  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [selectedCultivoId, setSelectedCultivoId] = useState('');
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [loadingContenido, setLoadingContenido] = useState(false);

  const [selectedSensorId, setSelectedSensorId] = useState('');

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
