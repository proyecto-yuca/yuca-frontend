import { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, Map, Marker, Polygon, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { isPointInPolygon, orderPolygonPoints, type LatLng } from '../../lib/mapGeometry';

export interface PolygonMapPoint {
  lat: string;
  lng: string;
}

interface PolygonPointsMapProps {
  points: PolygonMapPoint[];
  maxPoints: number;
  /** Área padre (ej. la finca) dentro de la cual deben quedar los puntos. */
  boundaryPoints?: LatLng[];
  /** Mensaje cuando se intenta ubicar un punto fuera de `boundaryPoints`. */
  outsideBoundaryMessage?: string;
  readOnly?: boolean;
  height?: number;
  onAddPoint?: (lat: number, lng: number) => void;
  onMovePoint?: (index: number, lat: number, lng: number) => void;
  onRemovePoint?: (index: number) => void;
}

const DEFAULT_CENTER = { lat: 4.711, lng: -74.0721 };
const DEFAULT_ZOOM = 6;
const FOCUSED_ZOOM = 15;

function parsePoints(points: PolygonMapPoint[]) {
  return points
    .map((p, index) => ({ index, lat: parseFloat(p.lat), lng: parseFloat(p.lng) }))
    .filter((p): p is { index: number; lat: number; lng: number } => !isNaN(p.lat) && !isNaN(p.lng));
}

function FitToPoints({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(FOCUSED_ZOOM);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    points.forEach(p => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [map, points]);

  return null;
}

export function PolygonPointsMap({
  points,
  maxPoints,
  boundaryPoints,
  outsideBoundaryMessage = 'El punto debe ubicarse dentro del área permitida.',
  readOnly = false,
  height = 280,
  onAddPoint,
  onMovePoint,
  onRemovePoint,
}: PolygonPointsMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [warning, setWarning] = useState<string | null>(null);
  const validPoints = useMemo(() => parsePoints(points), [points]);
  const polygonPaths = useMemo(() => orderPolygonPoints(validPoints), [validPoints]);
  const boundaryPolygon = useMemo(() => orderPolygonPoints(boundaryPoints ?? []), [boundaryPoints]);

  const isInsideBoundary = useCallback(
    (candidate: LatLng) => boundaryPolygon.length < 3 || isPointInPolygon(candidate, boundaryPolygon),
    [boundaryPolygon],
  );

  const fitPoints = useMemo(() => {
    const pts: LatLng[] = [...boundaryPolygon];
    validPoints.forEach(({ lat, lng }) => pts.push({ lat, lng }));
    return pts;
  }, [boundaryPolygon, validPoints]);

  const initialCenter = useMemo(() => {
    if (fitPoints.length === 0) return DEFAULT_CENTER;
    const lat = fitPoints.reduce((sum, p) => sum + p.lat, 0) / fitPoints.length;
    const lng = fitPoints.reduce((sum, p) => sum + p.lng, 0) / fitPoints.length;
    return { lat, lng };
  }, [fitPoints]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (readOnly || !onAddPoint || points.length >= maxPoints) return;
      const latLng = event.detail.latLng;
      if (!latLng) return;
      if (!isInsideBoundary(latLng)) {
        setWarning(outsideBoundaryMessage);
        return;
      }
      setWarning(null);
      onAddPoint(latLng.lat, latLng.lng);
    },
    [readOnly, onAddPoint, points.length, maxPoints, isInsideBoundary, outsideBoundaryMessage],
  );

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
        Configura la variable de entorno VITE_GOOGLE_MAPS_API_KEY para mostrar el mapa.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <APIProvider apiKey={apiKey}>
        <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
          <Map
            defaultCenter={initialCenter}
            defaultZoom={fitPoints.length > 0 ? FOCUSED_ZOOM : DEFAULT_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI={false}
            fullscreenControl={false}
            streetViewControl={false}
            mapTypeControl={false}
            onClick={handleMapClick}
          >
            <FitToPoints points={fitPoints} />
            {boundaryPolygon.length >= 3 && (
              <Polygon
                paths={boundaryPolygon}
                strokeColor="#b45309"
                strokeOpacity={0.9}
                strokeWeight={2}
                fillColor="#f59e0b"
                fillOpacity={0.08}
                clickable={false}
              />
            )}
            {polygonPaths.length >= 3 && (
              <Polygon
                paths={polygonPaths}
                strokeColor="#2E632B"
                strokeOpacity={0.9}
                strokeWeight={2}
                fillColor="#4e9b4b"
                fillOpacity={0.18}
                clickable={false}
              />
            )}
            {validPoints.map(({ index, lat, lng }) => (
              <Marker
                key={index}
                position={{ lat, lng }}
                label={String(index + 1)}
                draggable={!readOnly}
                onDragEnd={e => {
                  const pos = e.latLng;
                  if (!pos || !onMovePoint) return;
                  const candidate = { lat: pos.lat(), lng: pos.lng() };
                  if (!isInsideBoundary(candidate)) {
                    setWarning(outsideBoundaryMessage);
                    // Vuelve a emitir la posición anterior para que el marcador regrese.
                    onMovePoint(index, lat, lng);
                    return;
                  }
                  setWarning(null);
                  onMovePoint(index, candidate.lat, candidate.lng);
                }}
                onClick={() => !readOnly && onRemovePoint?.(index)}
                title={readOnly ? undefined : 'Arrastra para mover, clic para eliminar'}
              />
            ))}
          </Map>
        </div>
      </APIProvider>
      {warning && <p className="text-xs text-red-500">{warning}</p>}
      {!readOnly && (
        <p className="text-xs text-slate-400">
          Clic en el mapa para agregar un punto · arrastra un marcador para moverlo · clic en un marcador para eliminarlo.
        </p>
      )}
    </div>
  );
}
