# Implementación — 23 de julio de 2026

> Continuación de [`Implementación 2026-06-24.md`](./Implementación%202026-06-24.md). Cubre los tres commits del 23 de julio de 2026 sobre esa base.

## Resumen general

| Commit | Descripción |
|---|---|
| `9afd2bb` | Google Maps en puntos de ubicación de Cultivos |
| `c701440` | Ícono de sensor + polígono de cultivo en Google Maps |
| `f8813e6` | Sección Lectura: navegación Finca → Cultivo → Sensor |

---

## 1. Mapa interactivo de ubicación en Cultivos (Google Maps)

> Commit `9afd2bb`.

### Objetivo
El modal "agregar/editar cultivo" ya permitía capturar de 3 a 4 puntos de ubicación (lat/lng) mediante inputs manuales. Se agregó un mapa de Google Maps para poder colocar, arrastrar y eliminar esos puntos visualmente, sincronizado en ambos sentidos con los inputs existentes.

### Archivos

```
src/pages/cultivos/CultivoLocationMap.tsx   ← nuevo
src/pages/cultivos/CultivosPage.tsx         ← modificado
.env.example                                ← nueva variable
package.json                                ← nuevas dependencias
```

### Dependencias añadidas

```json
"@vis.gl/react-google-maps": "^1.9.0"   // dependency
"@types/google.maps": "^3.65.3"         // devDependency
```

### Variable de entorno

```
VITE_GOOGLE_MAPS_API_KEY=
```

Si no está configurada, `CultivoLocationMap` renderiza un placeholder ("Configura la variable de entorno...") en vez de fallar.

### `CultivoLocationMap.tsx`

Componente controlado que recibe los puntos del formulario y emite eventos hacia `CultivosPage`:

```typescript
interface CultivoLocationMapProps {
  points: CultivoLocationMapPoint[];       // { lat: string; lng: string }[]
  maxPoints: number;                       // 4
  onAddPoint: (lat: number, lng: number) => void;
  onMovePoint: (index: number, lat: number, lng: number) => void;
  onRemovePoint: (index: number) => void;
}
```

Comportamiento:
- **Clic en el mapa** → agrega un punto nuevo (`onAddPoint`), respetando `maxPoints`.
- **Arrastrar un marcador** → reposiciona el punto (`onMovePoint`) vía `onDragEnd`.
- **Clic en un marcador** → elimina ese punto (`onRemovePoint`).
- **Polígono**: cuando hay ≥3 puntos válidos, se dibuja un polígono ordenando los puntos angularmente alrededor de su centroide (`toPolygonPath`), evitando que el relleno quede autointersectado si el usuario agrega los puntos fuera de orden.
- **Auto-fit (`FitToPoints`)**: con 1 punto centra y hace zoom (`FOCUSED_ZOOM = 15`); con 2+ puntos ajusta el viewport con `map.fitBounds()` (padding 48px) cada vez que cambian los puntos válidos.
- Sin puntos válidos, el mapa muestra un centro/zoom por defecto (Colombia, zoom 6).

### Integración en `CultivosPage.tsx`

```typescript
const MAX_PUNTOS = 4; // antes era un literal `4` repetido en varios lugares

const addPointAt = (lat: number, lng: number) => {
  if (form.puntosUbicacion.length >= MAX_PUNTOS) return;
  setForm(prev => ({ ...prev, puntosUbicacion: [...prev.puntosUbicacion, { lat: String(lat), lng: String(lng) }] }));
};

const movePoint = (index: number, lat: number, lng: number) => {
  setForm(prev => ({
    ...prev,
    puntosUbicacion: prev.puntosUbicacion.map((p, i) => (i === index ? { lat: String(lat), lng: String(lng) } : p)),
  }));
};
```

El mapa se renderiza **entre** el botón "agregar punto" / mensaje de error y la lista de inputs lat/lng — ambas UIs (mapa e inputs manuales) editan el mismo estado `form.puntosUbicacion`, por lo que cualquier cambio en una se refleja de inmediato en la otra.

La validación existente no cambió: mínimo 3 puntos válidos, máximo `MAX_PUNTOS` (4).

---

## 2. Mapa interactivo de posición en Sensores (Google Maps)

> Commit `c701440`, misma sesión que la sección anterior.

### Objetivo
Los modales "agregar/editar sensor" ya capturaban una posición opcional (lat/lng) mediante inputs manuales. Se agregó un mapa de Google Maps —reutilizando `@vis.gl/react-google-maps`, ya incorporado para Cultivos— para poder colocar y mover esa posición visualmente, con un ícono propio que representa un sensor electrónico en vez del pin genérico de Google.

A diferencia de Cultivos (polígono de 3-4 puntos), un sensor solo tiene **un punto opcional**, así que el componente es más simple: no hay límite múltiple ni polígono.

### Archivo nuevo

```
src/pages/sensores/SensorLocationMap.tsx
```

```typescript
interface SensorLocationMapProps {
  lat: string;
  lng: string;
  onSetPoint: (lat: number, lng: number) => void;
  onClearPoint: () => void;
}
```

Comportamiento:
- **Clic en el mapa** → coloca/reemplaza la posición (`onSetPoint`), ya que solo se permite un punto.
- **Arrastrar el ícono** → reposiciona (`onSetPoint` vía `onDragEnd`).
- **Clic en el ícono** → limpia la posición (`onClearPoint`), dejando el sensor sin ubicación (campo opcional).
- **Auto-centrado (`FitToPoint`)**: si hay posición, centra y hace zoom (`FOCUSED_ZOOM = 16`); si no, usa el centro/zoom por defecto (igual que en Cultivos).
- Mismo placeholder que `CultivoLocationMap` si falta `VITE_GOOGLE_MAPS_API_KEY`.

### Ícono personalizado del sensor

En vez del pin por defecto de Google Maps, se usa un ícono SVG propio (chip con ondas de señal) codificado como *data URI* y pasado directamente como `icon` al `Marker`:

```typescript
const SENSOR_ICON_SVG = `<svg ...>...</svg>`.trim();
const SENSOR_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(SENSOR_ICON_SVG)}`;

<Marker position={point} icon={SENSOR_ICON_URL} draggable onDragEnd={...} onClick={onClearPoint} />
```

El tamaño del ícono se define en los atributos `width`/`height` del propio SVG (36×36) — no requiere `google.maps.Size`, evitando depender de que la API de Maps ya esté cargada al momento de construir el prop. Colores tomados de la paleta ya usada en el polígono de Cultivos: `forest-600` (#2E632B) y `forest-400` (#4e9b4b).

### Integración en `SensoresPage.tsx`

El mapa se inserta dentro de la sección "Posición (opcional)" del formulario compartido (`renderForm()`, usado tanto por el modal de crear como el de editar), entre la etiqueta y los inputs manuales de lat/lng — igual patrón que Cultivos: ambas UIs editan el mismo estado (`form.lat`, `form.lng`).

```typescript
<SensorLocationMap
  lat={form.lat}
  lng={form.lng}
  onSetPoint={(lat, lng) => setForm(prev => ({ ...prev, lat: String(lat), lng: String(lng) }))}
  onClearPoint={() => setForm(prev => ({ ...prev, lat: '', lng: '' }))}
/>
```

No se agregaron dependencias ni variables de entorno nuevas — reutiliza las ya incorporadas para Cultivos.

---

## 3. Módulo de Lectura — Finca → Cultivo → Sensor → Variable

> Commit `f8813e6`. Cambios en **dos repos**: `yuca-backend` y `yuca-frontend`.

### Objetivo

Las lecturas de sensores estaban modeladas **por finca**: la tabla `lecturas_sensor` solo tenía `finca_id` + un `sensor_id` de texto libre (sin relación real) + dos columnas fijas `humedad`/`temperatura`. La pantalla `FincaSensoresPage` (colgando de Fincas) mostraba ese agregado con umbrales hardcodeados.

Un sensor real pertenece a un **Cultivo** y tiene un conjunto arbitrario de **Variables** asignadas (ya modelado vía `sensor_variables`). Se rediseñó el flujo completo a **Finca → Cultivo → Sensor → variable(s) del sensor**, con una lectura genérica `{ sensor, variable, valor }` en vez de columnas fijas. El concepto de `estado` (normal/alerta/crítico) por umbrales fijos de humedad/temperatura se eliminó — no aplica a variables genéricas; se podría reintroducir más adelante como umbrales configurables por variable.

### Backend (`yuca-backend`)

**Esquema** — se reemplazó `lecturas_sensor` por una tabla `lecturas` normalizada:

```ruby
create_table :lecturas do |t|
  t.references :sensor,   null: false, foreign_key: { to_table: :sensores }
  t.references :variable, null: false, foreign_key: true
  t.decimal :valor, precision: 8, scale: 2, null: false
  t.date :fecha, null: false
  t.string :hora_registro, null: false
  t.timestamps
end
add_index :lecturas, [:sensor_id, :variable_id, :fecha, :hora_registro], unique: true
```

Migraciones: `db/migrate/20260723120000_create_lecturas.rb` + `..._drop_lecturas_sensor.rb`.

**Modelo** `app/models/lectura.rb` (reemplaza `lectura_sensor.rb`): `belongs_to :sensor`, `belongs_to :variable`, scopes `en_rango`, `por_variable`, `cronologico_desc`. Asociaciones nuevas: `Sensor#lecturas`, `Variable#lecturas`, `Finca#lecturas` (`through: :sensores`), `Cultivo#lecturas` (`through: :sensores`).

**Rutas y controlador** — lecturas anidadas bajo sensor (no bajo finca directamente):

```ruby
resources :fincas do
  resources :sensores do
    member { patch :toggle }
    resources :lecturas, only: %i[index create]
  end
end
```

```
GET  /api/v1/fincas/:finca_id/sensores/:sensor_id/lecturas   (filtros: variable_id, fecha_desde, fecha_hasta, page, page_size)
POST /api/v1/fincas/:finca_id/sensores/:sensor_id/lecturas   { lectura: { variable_id, fecha, hora_registro, valor } }
```

`app/controllers/api/v1/lecturas_controller.rb` (reemplaza `lecturas_sensor_controller.rb`), mismo permiso que antes (`require_permiso(:mediciones, :ver/:crear)` — módulo `mediciones` ya existente en `db/seeds/permisos.rb`, sin cambios). El serializer ahora embebe `sensor`, `cultivo` y `variable`:

```ruby
{
  id:, fecha:, horaRegistro:, valor:,
  sensor:   { id:, codigo:, nombre: },
  cultivo:  sensor.cultivo && { id:, nombre: },
  variable: { id:, nombre:, unidad: }
}
```

**Ingesta IoT** (`app/controllers/api/v1/iot/lecturas_sync_controller.rb`) — el payload cambió de `{sensor_id, humedad, temperatura}` a batch por variable:

```json
{ "lecturas": [
  { "sensor_codigo": "LS-BME-02", "variable_nombre": "Humedad", "fecha": "...", "hora_registro": "06:00", "valor": 72.4 }
]}
```

Resuelve `sensor` por `codigo` (scopeado a la finca) y `variable` por `nombre` (catálogo global, sin columna `codigo`). Dedup con `find_or_initialize_by(sensor:, variable:, fecha:, hora_registro:)`, acorde al nuevo índice único.

**Fix de inflexión de Rails** — al anidar `resources :lecturas` bajo `resources :sensores`, Rails singularizaba mal "sensores" → "sensore" (en vez de "sensor") para el param de la ruta. Se agregó en `config/initializers/inflections.rb`:

```ruby
ActiveSupport::Inflector.inflections(:en) do |inflect|
  inflect.irregular "sensor", "sensores"
end
```

**Seed de demo** (`db/seeds/lecturas_el_porvenir.rb`, cargado al final de `db/seeds.rb`) — puebla la finca **"Agrícola El Porvenir"** (ya existente en el seed) con:
- 3 `Variable`: Humedad (%), Temperatura (°C), Luminosidad (lux)
- 2 `Cultivo`: "Lote Norte", "Lote Sur" (con `puntos_ubicacion` cerca de Palmira, Valle del Cauca)
- 4 `Sensor` (2 por cultivo), cada uno con 1–3 variables asignadas
- ~960 `Lectura` de los últimos 30 días (franjas `06:00/12:00/18:00/23:00`)

El bloque viejo de generación de `LecturaSensor` en `db/seeds.rb` se eliminó; el orden de `delete_all` en el reset se ajustó para borrar `Lectura` **antes** de `Sensor` (FK real ahora existente entre ambas tablas).

### Frontend (`yuca-frontend`)

**Limpieza de nombres duplicados**: existían `services/sensores/sensorService.ts` (singular, CRUD) y `sensoresService.ts` (plural, lecturas) — fuente de confusión. Se eliminó el plural (`sensoresService.ts` + `sensores.types.ts`) y se creó:

```
src/types/lecturas.types.ts       ← Lectura, LecturasFilters, PaginatedLecturas
src/services/lecturas/lecturasService.ts   ← getAll(fincaId, sensorId, filters, page, pageSize), create(...)
```

**Se eliminó por completo** la pantalla vieja "por finca": `src/pages/fincas/FincaSensoresPage.tsx`, su ruta `/dashboard/fincas/:fincaId/sensores` y el enlace "Ver sensores" en `FincasPage.tsx`.

**`FincaSelector` extraído** a `src/components/selectors/FincaSelector.tsx` (estaba duplicado en `SensoresPage.tsx` y `CultivosPage.tsx`; la nueva página de Lecturas fue el tercer consumidor que justificó extraerlo).

**Nueva sección "Lectura"** en el sidebar (`modulo: 'mediciones'`, ya cubierto por el sistema de permisos existente — no requirió cambios de permisos), ruta `/dashboard/lecturas`:

- `src/pages/lecturas/LecturasPage.tsx` — flujo guiado: `FincaSelector` → `<select>` nativo de Cultivo (poblado con `cultivosService.getAll(fincaId)`) → tarjetas de Sensores del cultivo (filtro client-side `sensor.cultivo?.id === cultivoId` sobre `sensorService.getAll(fincaId)`, que ya trae `cultivo` y `variables` embebidos — sin necesidad de endpoint nuevo).
- `src/pages/lecturas/SensorLecturasPanel.tsx` — al elegir un sensor: tabs por variable (si tiene más de una), gráfico de línea de tiempo (Recharts) y tabla paginada, con filtro de rango de fechas.

**Gráfico (Recharts)** — nueva dependencia `recharts`. Serie única por variable activa (sin leyenda, el título ya la nombra), línea `forest-600` (#2E632B), grid recesivo, tooltip custom con valor + unidad:

```tsx
<LineChart data={chartData}>
  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} ... />
  <Line type="monotone" dataKey="valor" stroke="#2E632B" strokeWidth={2} dot={{ r: 3 }} />
</LineChart>
```

### Verificación realizada

- `curl` contra los endpoints nuevos: listar lecturas de un sensor (con y sin filtro `variable_id`), crear lectura manual, sync IoT (caso creado, duplicado y variable desconocida).
- `npx tsc --noEmit` y `npm run build` sin errores.
- Flujo completo probado en navegador (Playwright headless): login → Lectura → Finca "Agrícola El Porvenir" (preseleccionada) → Cultivo "Lote Sur" → sensor con 3 variables → cambio de tab → gráfico y tabla con datos reales, sin errores de consola.

### Nota operativa

El `.env` de `yuca-backend` apunta a un host RDS llamado `yuca-db-prod...` — **es la base de desarrollo** (confirmado), pero el nombre es engañoso; conviene renombrarlo para evitar futuras confusiones antes de correr migraciones/seeds.

---

## 4. Convenciones y patrones nuevos de esta sesión

| Patrón | Descripción |
|---|---|
| Mapa ↔ inputs sincronizados | Componentes de mapa (`CultivoLocationMap`, `SensorLocationMap`) son controlados: reciben el estado del form y emiten cambios vía callbacks, nunca mantienen su propio estado de puntos |
| Ícono de marcador vía data URI | Íconos personalizados en Google Maps se codifican como SVG inline (`data:image/svg+xml`) y se pasan como string a `icon`, evitando depender de `google.maps.Size`/`Point` antes de que la API esté cargada |
| Lectura genérica por variable | Un registro de lectura es `{ sensor, variable, valor }`, nunca columnas fijas por tipo de métrica — cualquier variable nueva del catálogo funciona sin cambios de esquema |
| Inflexión irregular en Rails | Nombres en español que Rails singulariza mal en rutas anidadas (`sensores` → `sensore`) se corrigen con `inflect.irregular` en `config/initializers/inflections.rb`, no con overrides de `param:` por ruta |
| Selectores compartidos | Componentes de selección reutilizados en ≥3 páginas (ej. `FincaSelector`) viven en `src/components/selectors/`, no duplicados por página |
