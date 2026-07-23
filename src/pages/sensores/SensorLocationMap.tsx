import { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, Map, Marker, Polygon, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { isPointInPolygon, orderPolygonPoints, type LatLng } from '../../lib/mapGeometry';

interface SensorLocationMapProps {
  lat: string;
  lng: string;
  cultivoPoints?: LatLng[];
  onSetPoint: (lat: number, lng: number) => void;
  onClearPoint: () => void;
}

const DEFAULT_CENTER = { lat: 4.711, lng: -74.0721 };
const DEFAULT_ZOOM = 6;
const FOCUSED_ZOOM = 16;
const FIT_PADDING = 48;

// Ícono de sensor electrónico (chip + ondas de señal) en el verde de marca (forest-600).
const SENSOR_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="14" r="13" fill="#2E632B" stroke="#ffffff" stroke-width="1.5"/>
  <polygon points="18,27 12,15 24,15" fill="#2E632B"/>
  <rect x="12.5" y="9" width="11" height="8" rx="1.5" fill="#ffffff"/>
  <circle cx="15" cy="11.3" r="0.9" fill="#2E632B"/>
  <circle cx="18" cy="11.3" r="0.9" fill="#2E632B"/>
  <circle cx="21" cy="11.3" r="0.9" fill="#2E632B"/>
  <circle cx="15" cy="14.7" r="0.9" fill="#2E632B"/>
  <circle cx="18" cy="14.7" r="0.9" fill="#2E632B"/>
  <circle cx="21" cy="14.7" r="0.9" fill="#2E632B"/>
  <path d="M9 6.5 A 8 8 0 0 1 27 6.5" stroke="#4e9b4b" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M6 3.2 A 12.5 12.5 0 0 1 30 3.2" stroke="#a8d3a5" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`.trim();

const SENSOR_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(SENSOR_ICON_SVG)}`;

// Punto pequeño para marcar los vértices del cultivo (no interactivo, solo referencia visual).
const CULTIVO_VERTEX_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
  <circle cx="7" cy="7" r="5.5" fill="#4e9b4b" stroke="#ffffff" stroke-width="1.5"/>
</svg>`.trim();

const CULTIVO_VERTEX_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CULTIVO_VERTEX_ICON_SVG)}`;

function parsePoint(lat: string, lng: string): LatLng | null {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (isNaN(parsedLat) || isNaN(parsedLng)) return null;
  return { lat: parsedLat, lng: parsedLng };
}

function FitToArea({ points }: { points: LatLng[] }) {
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
    map.fitBounds(bounds, FIT_PADDING);
  }, [map, points]);

  return null;
}

export function SensorLocationMap({ lat, lng, cultivoPoints, onSetPoint, onClearPoint }: SensorLocationMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [warning, setWarning] = useState<string | null>(null);

  const point = useMemo(() => parsePoint(lat, lng), [lat, lng]);
  const cultivoPolygon = useMemo(
    () => orderPolygonPoints(cultivoPoints ?? []),
    [cultivoPoints],
  );

  useEffect(() => setWarning(null), [cultivoPolygon]);

  const isInsideCultivo = useCallback(
    (candidate: LatLng) => cultivoPolygon.length < 3 || isPointInPolygon(candidate, cultivoPolygon),
    [cultivoPolygon],
  );

  const fitPoints = useMemo(() => {
    const pts = [...cultivoPolygon];
    if (point) pts.push(point);
    return pts;
  }, [cultivoPolygon, point]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const latLng = event.detail.latLng;
      if (!latLng) return;
      if (!isInsideCultivo(latLng)) {
        setWarning('El sensor debe ubicarse dentro del área del cultivo seleccionado.');
        return;
      }
      setWarning(null);
      onSetPoint(latLng.lat, latLng.lng);
    },
    [isInsideCultivo, onSetPoint],
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
        <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height: 240 }}>
          <Map
            defaultCenter={point ?? DEFAULT_CENTER}
            defaultZoom={point ? FOCUSED_ZOOM : DEFAULT_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI={false}
            fullscreenControl={false}
            streetViewControl={false}
            mapTypeControl={false}
            onClick={handleMapClick}
          >
            <FitToArea points={fitPoints} />

            {cultivoPolygon.length >= 3 && (
              <Polygon
                paths={cultivoPolygon}
                strokeColor="#2E632B"
                strokeOpacity={0.9}
                strokeWeight={2}
                fillColor="#4e9b4b"
                fillOpacity={0.12}
                clickable={false}
              />
            )}
            {cultivoPolygon.map((p, i) => (
              <Marker key={`cultivo-${i}`} position={p} icon={CULTIVO_VERTEX_ICON_URL} clickable={false} />
            ))}

            {point && (
              <Marker
                position={point}
                icon={SENSOR_ICON_URL}
                draggable
                onDragEnd={e => {
                  const pos = e.latLng;
                  if (!pos) return;
                  const candidate = { lat: pos.lat(), lng: pos.lng() };
                  if (!isInsideCultivo(candidate)) {
                    setWarning('El sensor debe ubicarse dentro del área del cultivo seleccionado.');
                    return; // el marcador vuelve a `point` al re-renderizar
                  }
                  setWarning(null);
                  onSetPoint(candidate.lat, candidate.lng);
                }}
                onClick={onClearPoint}
                title="Arrastra para mover, clic para quitar la posición"
              />
            )}
          </Map>
        </div>
      </APIProvider>
      {warning ? (
        <p className="text-xs text-red-500">{warning}</p>
      ) : (
        <p className="text-xs text-slate-400">
          {cultivoPolygon.length >= 3
            ? 'Los puntos verdes marcan el área del cultivo · coloca el sensor dentro de ella.'
            : 'Clic en el mapa para colocar el sensor'}
          {' '}· arrastra el ícono para moverlo · clic en el ícono para quitar la posición.
        </p>
      )}
    </div>
  );
}
