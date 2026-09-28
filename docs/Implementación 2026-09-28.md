# Implementación — 28 de septiembre de 2026

> Continuación de [`Implementación 2026-07-23.md`](./Implementación%202026-07-23.md). Contraparte backend: `yuca-backend/docs/SESION_2026_09_28.md`.

## Resumen general

| Cambio | Descripción |
|---|---|
| Área de la finca | La finca registra hasta 4 puntos `{lat, lng}` y se dibujan en Google Maps |
| Cultivos dentro de la finca | El mapa de cultivos muestra el área de la finca y no permite puntos fuera de ella |
| Sensores | El mapa de sensores también muestra el área de la finca |
| Componentes de mapa compartidos | `CultivoLocationMap` se reemplaza por `PolygonPointsMap` + `PolygonPointsEditor` en `src/components/maps/` |

---

## 1. Componentes de mapa compartidos

### Objetivo
Fincas y cultivos necesitan exactamente el mismo editor de puntos (mapa + lista lat/lng, 3 a 4 puntos). En vez de duplicar ~150 líneas, el editor que vivía en `CultivosPage` se extrajo a componentes reutilizables.

### Archivos

```
src/components/maps/PolygonPointsMap.tsx      ← nuevo (reemplaza CultivoLocationMap)
src/components/maps/PolygonPointsEditor.tsx   ← nuevo
src/lib/mapGeometry.ts                         ← nueva función validatePolygonPoints
src/pages/cultivos/CultivoLocationMap.tsx     ← eliminado
```

### `PolygonPointsMap.tsx`

Mapa controlado (mismo patrón que antes: recibe el estado del form y emite cambios por callbacks).

```typescript
interface PolygonPointsMapProps {
  points: PolygonMapPoint[];            // { lat: string; lng: string }[]
  maxPoints: number;
  boundaryPoints?: LatLng[];            // área padre (ej. la finca)
  outsideBoundaryMessage?: string;
  readOnly?: boolean;                   // detalle: sin clics ni arrastre
  height?: number;                      // default 280
  onAddPoint?: (lat: number, lng: number) => void;
  onMovePoint?: (index: number, lat: number, lng: number) => void;
  onRemovePoint?: (index: number) => void;
}
```

Comportamiento:
- Dibuja `boundaryPoints` como borde **naranja** (`#b45309`, relleno 8 %) y el polígono propio en **verde** encima.
- Si `boundaryPoints` tiene ≥ 3 puntos, un clic o un arrastre fuera del borde se rechaza, se muestra `outsideBoundaryMessage` en rojo y el marcador vuelve a su posición.
- El encuadre automático (`FitToPoints`) incluye los puntos del borde y los propios.
- Sin `VITE_GOOGLE_MAPS_API_KEY` muestra el mismo placeholder de antes.

### `PolygonPointsEditor.tsx`

Encabezado (etiqueta + "mín. 3, máx. N" + botón "Agregar punto"), error general, `PolygonPointsMap` y lista de inputs lat/lng con botón de eliminar.

```typescript
interface PolygonPointsEditorProps {
  label: string;
  points: PolygonMapPoint[];
  maxPoints: number;
  onChange: (points: PolygonMapPoint[]) => void;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;  // claves lat_${i} / lng_${i}
  boundaryPoints?: LatLng[];
  outsideBoundaryMessage?: string;
  emptyMessage?: string;
}
```

Un único `onChange` con la lista completa reemplaza los cinco handlers que tenía `CultivosPage` (`addPoint`, `addPointAt`, `removePoint`, `updatePoint`, `movePoint`).

### `validatePolygonPoints` (`src/lib/mapGeometry.ts`)

```typescript
validatePolygonPoints(points, { boundary?, outsideMessage? }): Record<string, string>
```

- `lat_${i}` / `lng_${i}`: valor no numérico o par incompleto.
- `puntosUbicacion`: menos de 3 puntos, o algún punto fuera de `boundary` (si tiene ≥ 3 puntos).

Vive en `lib/` (no en el componente) para que el archivo del componente solo exporte componentes (regla `react-refresh`).

---

## 2. Área de la finca (`FincasPage`)

### Archivos

```
src/types/fincas.types.ts              ← puntosUbicacion en Finca y FincaFormData
src/services/fincas/fincasService.ts   ← envía puntos_ubicacion
src/pages/fincas/FincasPage.tsx        ← nueva sección + detalle
```

### Tipos

```typescript
interface Finca {
  // ...
  puntosUbicacion: PuntoUbicacion[];            // { lat: number; lng: number }[]
}

interface FincaFormData {
  // ...
  puntosUbicacion: { lat: string; lng: string }[];
}
```

### Servicio
`buildBody` agrega `puntos_ubicacion` (solo los puntos completos, convertidos a número). Se envía siempre, así que editar la finca reemplaza el área completa.

### Formulario
- Nueva sección **"Área de la Finca"** entre *Ubicación* y *Dueño*, con `PolygonPointsEditor` (máx. 4, `MAX_PUNTOS_FINCA`).
- `validateForm` exige **3 a 4 puntos válidos** (vía `validatePolygonPoints`). Las fincas creadas antes de este cambio no tienen área: al editarlas hay que marcarla para poder guardar.
- Si el backend responde `422` en `puntos_ubicacion` (ej. *"el cultivo Lote Norte quedaría fuera del área de la finca"*), el mensaje se muestra en la sección del mapa en lugar del error genérico.

### Detalle
El modal de detalle muestra el área en un `PolygonPointsMap` de solo lectura (`readOnly`, 220 px), o *"Esta finca aún no tiene el área definida."*.

---

## 3. Cultivos dentro de la finca (`CultivosPage`)

- `fincaArea = selectedFinca?.puntosUbicacion ?? []` se pasa como `boundaryPoints` al editor → el área de la finca se ve en naranja y no se pueden colocar puntos fuera.
- `validateForm(form, fincaArea)` usa `validatePolygonPoints` con `boundary: fincaArea` y el mensaje *"Los puntos del cultivo deben estar dentro del área de la finca."*.
- El error `422` del backend (`puntos_ubicacion`: *"punto N está fuera del área de la finca"*) se muestra en el editor.
- Si la finca no tiene área, el comportamiento es el de antes (sin restricción).

---

## 4. Sensores: área de la finca en el mapa

### Archivos

```
src/pages/sensores/SensorLocationMap.tsx   ← nueva prop fincaPoints
src/pages/sensores/SensoresPage.tsx        ← pasa selectedFinca.puntosUbicacion
```

- `SensorLocationMap` recibe `fincaPoints?: LatLng[]` y dibuja el área de la finca con el mismo borde naranja; el cultivo sigue en verde encima.
- Límite de colocación del sensor:
  - Con cultivo que tiene área → dentro del cultivo (igual que antes).
  - Sin cultivo (o cultivo sin área) → dentro de la finca: *"El sensor debe ubicarse dentro del área de la finca."*.
- El encuadre incluye finca + cultivo + sensor; el texto de ayuda indica *"El borde naranja marca el área de la finca"* cuando aplica.

---

## 5. Verificación realizada

- `npx tsc -b` y `npm run build` sin errores.
- `npx eslint` sin errores en los archivos tocados. `npm run lint` sigue reportando 10 errores ya existentes, en archivos no modificados (`AuthContext`, `DashboardPage`, `LecturasPage`, `SensorLecturasPanel`) y 1 en `SensorLocationMap` (`setState` dentro de `useEffect`, previo a este cambio).
- Backend local (`http://localhost:3000`, según `.env.local`): `GET /api/v1/fincas` devuelve `puntosUbicacion`; solo **"Agrícola El Porvenir"** tiene área en el seed.
- **Pendiente:** probar el flujo en el navegador (dibujar el área de una finca, crear cultivo con puntos dentro y fuera, colocar sensor).

---

## 6. Convenciones y patrones nuevos de esta sesión

| Patrón | Descripción |
|---|---|
| Borde padre en naranja | En todos los mapas, el área contenedora (finca) se dibuja en naranja `#b45309` y el área propia (cultivo) en verde `#2E632B` |
| Componentes de mapa en `src/components/maps/` | Los mapas usados por más de una página dejan de vivir dentro de `pages/` |
| Editor con un solo `onChange` | El editor de puntos emite la lista completa; la página solo guarda el estado |
| Validación geométrica en `lib/mapGeometry.ts` | Lógica pura (orden de polígono, contención, validación de form) separada de los componentes |
| Misma geometría que el backend | El backend (`PuntosUbicacion` concern) replica `orderPolygonPoints` + `isPointInPolygon`, así que frontend y backend nunca discrepan |
