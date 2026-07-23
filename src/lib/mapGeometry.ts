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
