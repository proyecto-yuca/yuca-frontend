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

---

# Parte 2 — Eventos de tolerancia y alertas

> Contraparte backend: `yuca-backend/docs/SESION_2026_09_28.md` (Parte 2) y plan `PLAN_RANGOS_TOLERANCIA_2026_09_28.md`.

## 1. Archivos

```
src/types/variables.types.ts                 ← VariableEvento, VariableEventoFormData, eventos en Variable
src/types/lecturas.types.ts                  ← estado, eventos disparados, variable.rangos
src/types/alertas.types.ts                   ← nuevo
src/services/variables/variablesService.ts   ← eventos_attributes + orderEventosForSubmit
src/services/lecturas/lecturasService.ts     ← filtro soloFueraDeRango (estado=fuera)
src/services/alertas/alertasService.ts       ← nuevo
src/services/dashboard/dashboardStatsService.ts ← getResumenAlertas
src/lib/eventos.ts                           ← nuevo: estilos por severidad, formatRango, validación, mapeo de 422
src/components/ui/TagListInput.tsx           ← nuevo: lista de correos como chips
src/pages/variables/VariableEventoCard.tsx   ← nuevo
src/pages/variables/VariablesPage.tsx        ← sección Eventos + columna Eventos
src/pages/lecturas/SensorLecturasPanel.tsx   ← zona óptima, líneas por evento, puntos y badges por estado
src/pages/lecturas/AlertasPanel.tsx          ← nuevo: pestaña Alertas
src/pages/lecturas/LecturasPage.tsx          ← pestaña Alertas + enlace ?finca=&sensor=
src/pages/dashboard/DashboardPage.tsx        ← tarjeta Alertas recientes
```

## 2. Variables → Eventos

- El modal de la variable (ahora `size="lg"`) tiene la sección **Eventos de tolerancia**, con el botón *Agregar evento*.
- **Tarjeta de evento** (`VariableEventoCard`), colapsable:
  - **Encabezado:** nombre, badge de severidad, rango y cantidad de correos.
  - **Cuerpo:** nombre, severidad (Alerta / Crítico), mínimo / máximo con la unidad, switch *Enviar correo* con la lista de correos (`TagListInput`) e intervalo, switch *Evento activo* y botón de eliminar.
  - Los eventos existentes se eliminan con `_destroy`; los nuevos simplemente se quitan de la lista.
- **`TagListInput`:**
  - se agrega con Enter, coma o `;`, y se pueden pegar varios a la vez;
  - Backspace con el campo vacío quita el último;
  - valida el formato del correo, normaliza a minúsculas, evita duplicados y admite máximo 10.
- **Validación en el cliente** (`validateEventos`): nombre, al menos un límite, `min < max`, intervalo ≥ 1, al menos un correo con *Enviar correo* activo y nombres únicos. Al fallar, el modal se desplaza al primer evento con error.
- **Errores `422`:** `eventos[i].campo` se traduce a la tarjeta correcta con `mapEventoApiErrors`. Para que los índices coincidan con los del backend, `orderEventosForSubmit` envía primero los eventos existentes en su orden original y luego los nuevos.
- **Tabla:** columna **Eventos** con chips por severidad (`Humedad crítica 30 – 90 % ✉ 1`). La descripción se muestra desde `2xl`.

## 3. Lecturas

- **Gráfico:**
  - zona óptima sombreada en verde (la intersección de todos los rangos);
  - una línea punteada por límite de cada evento (ámbar alerta, rojo crítico) con etiqueta `mín` / `máx`;
  - puntos fuera de rango más grandes y con el color de su severidad;
  - el eje Y siempre incluye los límites.
- **Tabla:** columna **Estado** (Normal / Alerta / Crítico, con ▲▼ y un tooltip con los eventos disparados).
- **Filtro:** *Solo fuera de rango*.
- **Pestaña Alertas** (`AlertasPanel`):
  - filtros por severidad, variable y sensor;
  - tabla con evento, valor ▲▼, rango permitido, sensor / cultivo, fecha y estado del correo (*Enviado a N correos*, *Omitido por intervalo*, *Sin correo*, *Error al enviar*, *Pendiente*).
- **Enlace desde el correo:** `/dashboard/lecturas?finca=ID&sensor=ID` abre esa finca, su cultivo y el sensor. Se aplica una sola vez al montar la página y se queda en la URL, así que al recargar vuelve al mismo sensor.

## 4. Dashboard

Tarjeta **Alertas recientes**, entre *Acciones rápidas* y *Últimas lecturas*:
- contadores *N hoy* y *M críticas*;
- las últimas 5 alertas de todas las fincas, con un ícono de correo enviado o no enviado;
- cada fila abre el sensor en Lecturas.

Si el usuario no tiene permiso de mediciones, muestra "Todo en rango" en lugar de fallar.

## 5. Verificación realizada

- `npx tsc -b` y `npm run build` sin errores.
- `npx eslint` sin errores en los archivos nuevos o tocados en esta parte. `npm run lint` sigue con los 10 errores que ya existían (`react-hooks/set-state-in-effect` y `only-export-components` en archivos previos).
- Flujo completo en navegador (Playwright + Chrome) contra el backend local (`localhost:3001`, Postgres en Docker), **sin errores de consola**:
  1. login → Dashboard con *Alertas recientes* (7 hoy, 3 críticas);
  2. Variables → editar Humedad → agregar evento vacío → la validación muestra los errores y hace scroll hasta el evento;
  3. se completa el evento con 2 correos pegados de una vez → se guarda y aparece el chip en la tabla;
  4. enlace del correo `?finca=8&sensor=3` → se abre el sensor correcto con la zona óptima y las líneas de los eventos;
  5. *Solo fuera de rango* y pestaña *Alertas* con el estado de cada correo.
