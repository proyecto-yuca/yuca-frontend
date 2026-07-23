import { useCallback, useEffect, useMemo } from 'react';
import { APIProvider, Map, Marker, Polygon, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { orderPolygonPoints } from '../../lib/mapGeometry';

export interface CultivoLocationMapPoint {
  lat: string;
  lng: string;
}

interface CultivoLocationMapProps {
  points: CultivoLocationMapPoint[];
  maxPoints: number;
  onAddPoint: (lat: number, lng: number) => void;
  onMovePoint: (index: number, lat: number, lng: number) => void;
  onRemovePoint: (index: number) => void;
}

const DEFAULT_CENTER = { lat: 4.711, lng: -74.0721 };
const DEFAULT_ZOOM = 6;
const FOCUSED_ZOOM = 15;

function parsePoints(points: CultivoLocationMapPoint[]) {
  return points
    .map((p, index) => ({ index, lat: parseFloat(p.lat), lng: parseFloat(p.lng) }))
    .filter((p): p is { index: number; lat: number; lng: number } => !isNaN(p.lat) && !isNaN(p.lng));
}

function FitToPoints({ points }: { points: { lat: number; lng: number }[] }) {
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

export function CultivoLocationMap({
  points,
  maxPoints,
  onAddPoint,
  onMovePoint,
  onRemovePoint,
}: CultivoLocationMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const validPoints = useMemo(() => parsePoints(points), [points]);
  const polygonPaths = useMemo(() => orderPolygonPoints(validPoints), [validPoints]);

  const initialCenter = useMemo(() => {
    if (validPoints.length === 0) return DEFAULT_CENTER;
    const lat = validPoints.reduce((sum, p) => sum + p.lat, 0) / validPoints.length;
    const lng = validPoints.reduce((sum, p) => sum + p.lng, 0) / validPoints.length;
    return { lat, lng };
  }, [validPoints]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (points.length >= maxPoints) return;
      const latLng = event.detail.latLng;
      if (!latLng) return;
      onAddPoint(latLng.lat, latLng.lng);
    },
    [points.length, maxPoints, onAddPoint],
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
        <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height: 280 }}>
          <Map
            defaultCenter={initialCenter}
            defaultZoom={validPoints.length > 0 ? FOCUSED_ZOOM : DEFAULT_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI={false}
            fullscreenControl={false}
            streetViewControl={false}
            mapTypeControl={false}
            onClick={handleMapClick}
          >
            <FitToPoints points={validPoints} />
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
                draggable
                onDragEnd={e => {
                  const pos = e.latLng;
                  if (!pos) return;
                  onMovePoint(index, pos.lat(), pos.lng());
                }}
                onClick={() => onRemovePoint(index)}
                title="Arrastra para mover, clic para eliminar"
              />
            ))}
          </Map>
        </div>
      </APIProvider>
      <p className="text-xs text-slate-400">
        Clic en el mapa para agregar un punto · arrastra un marcador para moverlo · clic en un marcador para eliminarlo.
      </p>
    </div>
  );
}
