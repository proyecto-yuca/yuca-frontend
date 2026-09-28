export interface LatLng {
  lat: number;
  lng: number;
}

/** Ordena puntos de un polígono angularmente alrededor de su centroide para evitar bordes autointersectados. */
export function orderPolygonPoints(points: LatLng[]): LatLng[] {
  if (points.length < 3) return [];
  const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return [...points]
    .sort(
      (a, b) =>
        Math.atan2(a.lat - centerLat, a.lng - centerLng) -
        Math.atan2(b.lat - centerLat, b.lng - centerLng),
    )
    .map(({ lat, lng }) => ({ lat, lng }));
}

/** Ray casting: asume que `polygon` ya está ordenado (ver `orderPolygonPoints`). */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const { lat: y, lng: x } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface PointFormValue {
  lat: string;
  lng: string;
}

/**
 * Valida los puntos de un formulario: formato numérico, mínimo 3 puntos y, si se pasa
 * `boundary` (con 3+ puntos), que cada punto quede dentro de ese polígono.
 * Claves de error: `lat_${i}`, `lng_${i}` y `puntosUbicacion`.
 */
export function validatePolygonPoints(
  points: PointFormValue[],
  options: { boundary?: LatLng[]; outsideMessage?: string } = {},
): Record<string, string> {
  const errors: Record<string, string> = {};

  points.forEach((p, i) => {
    if (p.lat.trim() && isNaN(parseFloat(p.lat))) errors[`lat_${i}`] = 'Latitud inválida';
    if (p.lng.trim() && isNaN(parseFloat(p.lng))) errors[`lng_${i}`] = 'Longitud inválida';
    if (p.lat.trim() && !p.lng.trim()) errors[`lng_${i}`] = 'Ingresa la longitud';
    if (!p.lat.trim() && p.lng.trim()) errors[`lat_${i}`] = 'Ingresa la latitud';
  });

  const validPoints = points.filter(p => p.lat.trim() !== '' && p.lng.trim() !== '');
  if (validPoints.length < 3) {
    errors.puntosUbicacion = 'Debes ingresar al menos 3 puntos de ubicación';
  }

  const boundary = orderPolygonPoints(options.boundary ?? []);
  if (boundary.length >= 3) {
    const outside = points.some(p => {
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);
      return !isNaN(lat) && !isNaN(lng) && !isPointInPolygon({ lat, lng }, boundary);
    });
    if (outside) {
      errors.puntosUbicacion = options.outsideMessage ?? 'Todos los puntos deben estar dentro del área permitida.';
    }
  }

  return errors;
}
