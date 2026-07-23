# Implementación — 24 de junio de 2026

> **Actualizado el 23 de julio de 2026** — se agregaron las secciones 7 (mapa de Google Maps en Cultivos) y 8 (mapa de Google Maps en Sensores), no incluidas en la sesión original.

## Resumen general

Sesión de desarrollo sobre el frontend Yuca (React 19 + TypeScript + Vite + Tailwind CSS v4). Se completaron cuatro bloques principales: corrección del manejo de errores en modales, módulo completo de Usuarios, mejoras de layout y (en una sesión posterior) mapa interactivo de ubicación en Cultivos.

---

## 1. Fix: errores 403 dentro de modales

### Problema
Cuando la API devolvía un error 403 (o cualquier error no relacionado con un campo específico) mientras había un modal abierto, el mensaje se mostraba como un toast en la página, quedando oculto detrás del overlay del modal.

### Solución
Se introdujo el patrón `modalError` en todas las páginas con modales: en lugar de llamar a `showToast('error', ...)` para errores generales, se guarda el mensaje en un estado `modalError` que se renderiza como un `<Alert variant="error">` dentro del propio modal.

### Páginas afectadas

| Página | Modales corregidos |
|---|---|
| `CultivosPage.tsx` | Crear, Editar, Eliminar |
| `VariablesPage.tsx` | Crear, Editar, Eliminar |
| `SensoresPage.tsx` | Crear, Editar, Eliminar |
| `PermisosPage.tsx` | Crear rol, Editar rol, Eliminar rol |

### Patrón aplicado

```typescript
// Estado adicional por página
const [modalError, setModalError] = useState<string | null>(null);

// En open/close handlers — siempre limpiar
const openCreate = () => {
  setForm(EMPTY_FORM);
  setFormErrors({});
  setModalError(null);   // ← limpiar al abrir
  setCreateOpen(true);
};

const closeDelete = () => {
  setDeleteTarget(null);
  setModalError(null);   // ← limpiar al cerrar
};

// En applyApiErrors — reemplazar showToast por setModalError
const applyApiErrors = (err: unknown) => {
  if (isApiError(err) && err.fieldErrors) {
    // errores de campo → inline bajo cada input (sin cambios)
    const mapped: Record<string, string> = {};
    Object.entries(err.fieldErrors).forEach(([key, msgs]) => { mapped[key] = msgs[0]; });
    setFormErrors(mapped);
  } else {
    setModalError(isApiError(err) ? err.message : 'Ocurrió un error inesperado.');
    // antes: showToast('error', ...)
  }
};

// En handleDelete — error queda visible en el modal
const handleDelete = async () => {
  try {
    await service.delete(target.id);
    closeDelete();
    showToast('success', 'Eliminado.');
  } catch (err) {
    setModalError(isApiError(err) ? err.message : 'Error al eliminar.');
    // modal permanece abierto, error visible dentro
  }
};

// En renderForm() y body del modal de eliminar
{modalError && <Alert variant="error">{modalError}</Alert>}
```

---

## 2. Módulo de Usuarios — CRUD completo

### Archivos creados

```
src/types/usuarios.types.ts
src/services/usuarios/usuariosService.ts
src/pages/usuarios/UsuariosPage.tsx
```

### 2.1 Tipos (`usuarios.types.ts`)

```typescript
export interface UsuarioRol {
  id: string;
  identificador: string;
  nombre: string;
}

export interface Usuario {
  id: string;
  name: string;
  email: string;
  estado: boolean;          // true = activo, false = inactivo
  rol: UsuarioRol;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioFormData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  rol_id: string;
}
```

### 2.2 Servicio (`usuariosService.ts`)

| Método | HTTP | Endpoint | Notas |
|---|---|---|---|
| `getAll()` | GET | `/usuarios` | Lista todos los usuarios |
| `create(formData)` | POST | `/usuarios` | Body envuelto en `{ usuario: {...} }` |
| `update(id, formData)` | PATCH | `/usuarios/:id` | Solo name, email, rol_id — sin password |
| `changePassword(id, pw, conf)` | PATCH | `/usuarios/:id/cambiar_password` | Body: `{ password, confirmation_password }` |
| `toggle(id)` | PATCH | `/usuarios/:id/toggle_estado` | Sin body, alterna `estado` |
| `delete(id)` | DELETE | `/usuarios/:id` | 422 si intenta eliminarse a sí mismo |

```typescript
// create — body wrapping
async create(formData: UsuarioFormData): Promise<Usuario> {
  const response = await privateClient.post<Usuario>('/usuarios', {
    usuario: {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
      rol_id: parseInt(formData.rol_id, 10),
    },
  });
  return response.data;
},

// changePassword — endpoint separado
async changePassword(id: string, password: string, passwordConfirmation: string): Promise<void> {
  await privateClient.patch(`/usuarios/${id}/cambiar_password`, {
    password,
    confirmation_password: passwordConfirmation,  // campo exacto del backend
  });
},
```

### 2.3 Página (`UsuariosPage.tsx`)

#### Funcionalidades

- **Listado** en tabla con: nombre + rol debajo, correo, estado (badge Activo/Inactivo), fecha de registro
- **Búsqueda** en tiempo real por nombre (cliente, sin llamada a API), con botón × para limpiar y contador `X de Y usuarios`
- **Crear usuario** — modal con nombre, email, rol (dropdown de `/roles`), contraseña + confirmación
- **Editar usuario** — modal con nombre, email, rol (sin contraseña — se gestiona por separado)
- **Restablecer contraseña** — modal dedicado que llama al endpoint `cambiar_password`
- **Activar / Desactivar** — alterna `estado` via `toggle_estado`, texto del menú cambia según estado actual
- **Eliminar** — modal de confirmación; deshabilitado si es el propio usuario autenticado
- Patrón `modalError` aplicado en todos los modales

#### RowMenu (menú de tres puntos por fila)

Cada fila tiene un botón `⋮` que abre un dropdown con cuatro opciones:

```
✏️  Editar
🔑  Restablecer contraseña
⏻   Desactivar / Activar
────────────────
🗑️  Eliminar          ← rojo, deshabilitado si es el propio usuario
```

**Implementación con portal** para evitar clipping del `overflow-hidden` de la tabla:

```typescript
// Calcula posición fixed desde getBoundingClientRect()
const handleOpen = (e: React.MouseEvent) => {
  e.stopPropagation();
  const rect = buttonRef.current!.getBoundingClientRect();
  const MENU_HEIGHT = 220;
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < MENU_HEIGHT) {
    // abre hacia arriba
    setMenuStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
  } else {
    // abre hacia abajo
    setMenuStyle({ position: 'fixed', top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }
  setOpen(prev => !prev);
};

// Se monta en document.body para escapar del overflow
{menu && createPortal(menu, document.body)}
```

El menú también se cierra con Escape, click fuera, scroll o resize.

#### Estados de modales

| Estado | Tipo | Propósito |
|---|---|---|
| `createOpen` | boolean | Abrir/cerrar modal crear |
| `editTarget` | `Usuario \| null` | Usuario en edición |
| `passwordTarget` | `Usuario \| null` | Usuario para restablecer contraseña |
| `deleteTarget` | `Usuario \| null` | Usuario a eliminar |
| `togglingId` | `string \| null` | ID del usuario cuyo toggle está en curso |
| `modalError` | `string \| null` | Error en modales crear/editar |
| `pwModalError` | `string \| null` | Error en modal de contraseña |
| `deleteModalError` | `string \| null` | Error en modal de eliminar |

### 2.4 Roles (dropdown)

Los roles se cargan al montar la página junto con los usuarios (`Promise.all`) usando el `rolesService.getAll()` que ya existía (`GET /roles`). Así el dropdown de rol en los modales siempre muestra las opciones actuales del sistema.

---

## 3. Cambios en archivos existentes

### Router (`src/router/index.tsx`)

```typescript
{ path: '/dashboard/usuarios', element: <UsuariosPage /> },
```

### Sidebar (`src/components/layout/DashboardLayout.tsx`)

**Nuevo ítem** "Usuarios" añadido como **segunda opción** del menú (después de Inicio):

```
Inicio
Usuarios      ← nuevo, modulo: 'usuarios'
Permisos
Variables
Fincas
Cultivos
Sensores
```

**Rol del usuario** ahora visible en el layout en lugar del correo:
- Tarjeta inferior del sidebar: nombre → rol
- Header superior (desktop): nombre → rol

```tsx
// Antes
<p className="text-xs text-slate-500">{user?.email}</p>

// Después
<p className="text-xs text-slate-500">{user?.rol?.nombre}</p>
```

**Tabla de usuarios**: nombre del usuario muestra el rol como subtexto debajo (gris, xs), eliminando la columna "Rol" separada.

---

## 4. Endpoints de la API — Usuarios

### Listar
```
GET /api/v1/usuarios
Authorization: Bearer {token}
```

### Crear
```
POST /api/v1/usuarios
{ "usuario": { "name", "email", "password", "password_confirmation", "rol_id" } }
```

### Actualizar (datos generales)
```
PATCH /api/v1/usuarios/:id
{ "usuario": { "name", "email", "rol_id" } }
```

### Cambiar contraseña
```
PATCH /api/v1/usuarios/:id/cambiar_password
{ "password": "...", "confirmation_password": "..." }
```

### Activar / Desactivar
```
PATCH /api/v1/usuarios/:id/toggle_estado
(sin body)
→ { ..., "estado": true | false }
```
No se puede cambiar el estado del propio usuario autenticado (422).

### Eliminar
```
DELETE /api/v1/usuarios/:id
→ 204 No Content
```
No se puede eliminar el propio usuario autenticado (422).

---

## 6. Mapa interactivo de ubicación en Cultivos (Google Maps)

> Añadido el 23 de julio de 2026 (commit `9afd2bb`), posterior a la sesión original.

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

## 8. Mapa interactivo de posición en Sensores (Google Maps)

> Añadido el 23 de julio de 2026, en la misma sesión que la sección 7.

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

## 9. Convenciones y patrones establecidos

| Patrón | Descripción |
|---|---|
| `modalError` | Estado de error dentro de modales (no toast) para errores 403/500 |
| `closeDelete()` | Helper que limpia `deleteTarget` y `modalError` juntos |
| `applyApiErrors()` | Discrimina errores de campo (422) vs. errores generales (403/500) |
| Body wrapping | Recursos rails usan `{ recurso: { ... } }` en POST/PATCH |
| Portal dropdown | Menús dentro de tablas se renderizan en `document.body` con `position: fixed` para evitar clipping |
| Detección de espacio | El dropdown mide `window.innerHeight - rect.bottom` para abrir hacia arriba si no hay espacio |
| Mapa ↔ inputs sincronizados | Componentes de mapa (`CultivoLocationMap`, `SensorLocationMap`) son controlados: reciben el estado del form y emiten cambios vía callbacks, nunca mantienen su propio estado de puntos |
| Ícono de marcador vía data URI | Íconos personalizados en Google Maps se codifican como SVG inline (`data:image/svg+xml`) y se pasan como string a `icon`, evitando depender de `google.maps.Size`/`Point` antes de que la API esté cargada |
