import { Input } from '../ui/Input';
import type { LatLng } from '../../lib/mapGeometry';
import { PolygonPointsMap, type PolygonMapPoint } from './PolygonPointsMap';

interface PolygonPointsEditorProps {
  label: string;
  points: PolygonMapPoint[];
  maxPoints: number;
  onChange: (points: PolygonMapPoint[]) => void;
  /** Error general de la lista (ej. "mínimo 3 puntos"). */
  error?: string;
  /** Errores por punto con claves `lat_${i}` / `lng_${i}`. */
  fieldErrors?: Partial<Record<string, string>>;
  boundaryPoints?: LatLng[];
  outsideBoundaryMessage?: string;
  emptyMessage?: string;
}

export function PolygonPointsEditor({
  label,
  points,
  maxPoints,
  onChange,
  error,
  fieldErrors = {},
  boundaryPoints,
  outsideBoundaryMessage,
  emptyMessage = 'Sin puntos de ubicación',
}: PolygonPointsEditorProps) {
  const canAdd = points.length < maxPoints;

  const addPoint = () => {
    if (!canAdd) return;
    onChange([...points, { lat: '', lng: '' }]);
  };

  const addPointAt = (lat: number, lng: number) => {
    if (!canAdd) return;
    onChange([...points, { lat: String(lat), lng: String(lng) }]);
  };

  const removePoint = (index: number) => {
    onChange(points.filter((_, i) => i !== index));
  };

  const updatePoint = (index: number, field: 'lat' | 'lng', value: string) => {
    onChange(points.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const movePoint = (index: number, lat: number, lng: number) => {
    onChange(points.map((p, i) => (i === index ? { lat: String(lat), lng: String(lng) } : p)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-700">
          {label}{' '}
          <span className="text-xs font-normal text-slate-400">(mín. 3, máx. {maxPoints})</span>
        </label>
        {canAdd && (
          <button
            type="button"
            onClick={addPoint}
            className="flex items-center gap-1 text-xs font-medium text-forest-600 hover:text-forest-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar punto
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      <div className="mb-3">
        <PolygonPointsMap
          points={points}
          maxPoints={maxPoints}
          boundaryPoints={boundaryPoints}
          outsideBoundaryMessage={outsideBoundaryMessage}
          onAddPoint={addPointAt}
          onMovePoint={movePoint}
          onRemovePoint={removePoint}
        />
      </div>

      {points.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-2">
          {points.map((punto, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Latitud"
                  value={punto.lat}
                  onChange={e => updatePoint(i, 'lat', e.target.value)}
                  error={fieldErrors[`lat_${i}`]}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Longitud"
                  value={punto.lng}
                  onChange={e => updatePoint(i, 'lng', e.target.value)}
                  error={fieldErrors[`lng_${i}`]}
                />
              </div>
              <button
                type="button"
                onClick={() => removePoint(i)}
                className="mt-2 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                aria-label="Eliminar punto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
