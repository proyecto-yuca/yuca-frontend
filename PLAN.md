# Plan: Dashboards reales por módulo + permisos

## Estado (2026-08-26)

- ✅ Implementado y verificado (`tsc -b` sin errores, dev server responde 200): guard `RequirePermiso`, rutas protegidas, `Tabs`, resúmenes de Fincas/Cultivos/Sensores/Lecturas, `/dashboard` con datos reales vía `dashboardStatsService`.
- ✅ Implementado y verificado (`tsc -b` sin errores): sección "5. Gráfica de usuarios" — `UsuariosPage.tsx` ahora tiene pestaña Resumen con stats (total/activos/inactivos) y `BarChart` "Usuarios por rol".
- ✅ Implementado y verificado (`tsc -b` sin errores, dev server 200): sección "6. Cuatro gráficas adicionales" — tendencia de lecturas por día (`LecturasResumen`), fincas registradas por mes (`FincasResumen`), sensores instalados por mes (`SensoresResumen`) y pestaña Resumen nueva en `VariablesPage.tsx` con "sensores por variable" a nivel global.

## Contexto

`yuca-frontend` (React 19 + Vite + TS, backend Rails en `yuca-backend`) ya tiene CRUD completo y funcional contra datos reales para los 4 módulos (`FincasPage`, `CultivosPage`, `SensoresPage`, `LecturasPage`, rutas `/dashboard/fincas|cultivos|sensores|lecturas`). Lo que falta:

1. **`/dashboard`** (`DashboardPage.tsx`) hoy es casi 100% mock: `stats`, `recentActivity` y `quickActions` son arrays hardcodeados de un dashboard SaaS genérico ("Ingresos del mes", "María López se registró…"), sin relación con fincas/cultivos/sensores/lecturas. Solo el perfil del usuario es real.
2. No existe una vista tipo "resumen/analítica" dentro de cada módulo — solo el listado CRUD.
3. Gap de seguridad en frontend: `PrivateRoute` solo valida autenticación, no permisos por módulo. El menú lateral (`DashboardLayout`) oculta links vía `puede(modulo,'ver')`, pero cualquier usuario autenticado puede navegar directo por URL a un módulo sin permiso — el backend sí lo bloquea (`require_permiso`) al pedir datos, pero el frontend muestra una página rota/vacía en vez de negar el acceso limpiamente.

Decisiones ya confirmadas con el usuario:
- El "dashboard" de cada módulo va como **pestaña "Resumen" dentro de la página existente** (junto a "Listado"), no como ruta nueva.
- Las métricas se **calculan en el frontend** reutilizando los servicios/endpoints ya existentes (`fincasService`, `cultivosService`, `sensorService`, `lecturasService`) — sin tocar el backend Rails.
- Se agrega un **guard de ruta reutilizable** (`RequirePermiso`) basado en el `puede()` ya existente en `AuthContext`/`useAuth`, aplicado a las 4 rutas de módulo. `/dashboard` general se deja tal cual (solo auth, sin permiso de módulo), preservando su comportamiento actual.

## 1. Guard de permisos por ruta

Crear `yuca-frontend/src/router/RequirePermiso.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RequirePermiso({ modulo, children }: { modulo: string; children: React.ReactNode }) {
  const { puede } = useAuth();
  if (!puede(modulo, 'ver')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

En `yuca-frontend/src/router/index.tsx`, envolver los 4 elementos dentro del grupo `<PrivateRoute />` con el mismo identificador de `modulo` que ya usa `DashboardLayout.tsx` (líneas 15-102) para el filtro del sidebar — clave para que la lógica de permisos sea **la misma** en ambos lados:
- `/dashboard/fincas` → `modulo="fincas"`
- `/dashboard/cultivos` → `modulo="cultivos"`
- `/dashboard/sensores` → `modulo="sensores"`
- `/dashboard/lecturas` → `modulo="mediciones"` (así lo nombra ya el sidebar y el backend `lecturas_controller.rb`, aunque la ruta se llame `/lecturas` — mantener esa inconsistencia de naming existente, no renombrar nada)

`/dashboard` (DashboardPage) no se envuelve — sigue solo con `PrivateRoute`, igual que hoy.

No se toca `PrivateRoute.tsx`, `AuthContext.tsx` ni `useAuth.ts` — se reutiliza `puede()` tal como está.

## 2. Componente Tabs reutilizable

Añadir `yuca-frontend/src/components/ui/Tabs.tsx`: toggle simple de 2 botones ("Listado" / "Resumen") con el mismo estilo de pills que ya usa `SensorLecturasPanel` para variables (línea ~100-116 de `SensorLecturasPanel.tsx`). Exportarlo en `components/ui/index.ts`. Se usa en las 4 páginas de módulo para alternar entre la tabla CRUD actual y la nueva pestaña de resumen, con estado local (`const [view, setView] = useState<'listado'|'resumen'>('listado')`), siguiendo el mismo patrón de estado local que ya usan estas páginas (`formModal`, etc.) — sin URL/query param.

## 3. Resumen por módulo

Cada resumen es una sub-vista dentro de la página existente, con tarjetas de stats (mismo estilo `rounded-xl border border-slate-100 bg-white shadow-sm` que ya usan las "stats strip" de `FincasPage.tsx` líneas 553-568) + gráficas con `recharts` (ya instalado y usado en `SensorLecturasPanel.tsx`).

**`FincasPage.tsx`** (resumen no depende de finca seleccionada, es global):
- Fetch adicional de **todas** las fincas sin paginar (`fincasService.getAll({search:'',estado:'todos'}, 1, 1000)`, mismo truco de `pageSize` grande que ya usan `CultivosPage`/`SensoresPage`/`LecturasPage` para cargar fincas completas), solo cuando se entra a la pestaña Resumen (lazy).
- Tarjetas: Total fincas, Activas, Inactivas, Área total (ha, suma de `area`).
- Gráfica: `BarChart` de recharts — cantidad de fincas por `ubicacion.departamento`.

**`CultivosPage.tsx`** (resumen scoped a `selectedFinca`, reutiliza `cultivos` ya cargado por `cultivosService.getAll(fincaId)` — trae la lista completa, no hace falta refetch):
- Fetch adicional de `sensorService.getAll(fincaId)` (aún no se pide en esta página) solo para la pestaña Resumen, para cruzar cultivo↔sensores.
- Tarjetas: Total cultivos, Cultivos con sensores asignados, Cultivos sin sensores.
- Gráfica: `BarChart` — sensores por cultivo (`sensores.filter(s => s.cultivo?.id === cultivo.id).length`).

**`SensoresPage.tsx`** (resumen scoped a `selectedFinca`, reutiliza `sensores`/`cultivos` ya cargados en esa página):
- Tarjetas: Total sensores, Activos, Inactivos, Sin cultivo asignado.
- Gráfica: `BarChart`/`PieChart` — sensores por variable (contar por `sensor.variables[].nombre`).

**`LecturasPage.tsx`** (resumen scoped a `selectedFinca`, agregando sobre todos sus sensores):
- Como `lecturasService.getAll` requiere `sensorId`, hacer `Promise.all` sobre `sensores` de la finca pidiendo página 1 con `pageSize` pequeño (ej. 5, sin filtro de variable) para armar una tabla "Últimas lecturas" (ordenar por `fecha`+`horaRegistro` desc, top 5-8) y sumar `result.total` de cada sensor con filtro `fechaDesde=fechaHasta=hoy` para la tarjeta "Lecturas registradas hoy".
- Tarjetas: Sensores con lecturas hoy, Total lecturas registradas hoy, Última lectura (fecha/hora más reciente).
- Tabla: "Últimas lecturas" (sensor, variable, valor, fecha/hora) reutilizando el estilo de tabla de `SensorLecturasPanel.tsx` (líneas 180-207).
- Nota explícita a incluir en el código como comentario/log si conviene: este patrón hace N llamadas (una por sensor); aceptable a la escala actual de la app, es la aproximación "cliente" ya acordada.

## 4. `/dashboard` con datos reales

Reescribir `yuca-frontend/src/pages/dashboard/DashboardPage.tsx`:
- Eliminar los arrays hardcodeados `stats`, `recentActivity`.
- Nuevo fetch agregando desde los servicios existentes (mismo patrón `useEffect`+`useState` que ya usa la página para `profile`):
  1. `fincasService.getAll(...)` (todas, sin paginar) → total fincas / activas.
  2. Para cada finca: `Promise.all([cultivosService.getAll(finca.id), sensorService.getAll(finca.id)])` → sumar total cultivos, total sensores, sensores activos.
  3. Reusar el mismo enfoque de "últimas lecturas" del punto 3 (Lecturas) pero agregado sobre todas las fincas/sensores del usuario, limitado a un top N (ej. 8) para la sección "Actividad reciente" — reemplaza `recentActivity` por lecturas reales (sensor, variable, valor, fecha/hora) en vez de nombres de usuarios inventados.
- Encapsular esta agregación en un helper compartido, ej. `yuca-frontend/src/services/dashboard/dashboardStatsService.ts`, para no duplicar la lógica de "últimas lecturas de una finca" entre `DashboardPage` y el resumen de `LecturasPage` (punto 3).
- 4 tarjetas de stats reales: Total fincas (con activas como subtexto), Total cultivos, Sensores activos (vs total), Lecturas registradas hoy.
- `quickActions`: reemplazar las 4 acciones genéricas ("Nuevo usuario", "Ver reportes", "Configuración", "Exportar datos", que hoy no tienen `onClick`) por accesos reales y funcionales a los módulos del dominio: "Nueva finca" → navega a `/dashboard/fincas`, "Nuevo cultivo" → `/dashboard/cultivos`, "Nuevo sensor" → `/dashboard/sensores`, "Ver lecturas" → `/dashboard/lecturas` (usar `useNavigate` de `react-router-dom`, mismo import que ya usa `DashboardLayout.tsx`).
- Mantener intacto: banner de saludo, tarjeta de perfil (`dashboardService.getProfile()`), y el layout general (`DashboardLayout`).

## 5. Gráfica de usuarios (nuevo, a petición del usuario)

Extiende el mismo patrón de "Resumen" (punto 3) a `UsuariosPage.tsx` (`/dashboard/usuarios`), que no tenía pestaña de resumen. Implementado con datos ya cargados por `usuariosService.getAll()` (sin tocar backend, sin pedir nada nuevo):
- Componente `UsuariosResumen` con tarjetas: Total usuarios, Activos, Inactivos (`usuario.estado: boolean`).
- `BarChart` de recharts: "Usuarios por rol", agrupando el array `usuarios` en frontend por `usuario.rol.nombre`.
- Pestaña `Tabs` "Listado"/"Resumen" en el header, junto al buscador y el botón "Crear usuario"; la tabla existente (con su búsqueda, menú de acciones, modales de crear/editar/reset password/eliminar) queda intacta bajo "Listado", sin modificar su lógica.
- No se agregó `RequirePermiso` a `/dashboard/usuarios` — fuera del alcance original acordado (guard solo para fincas/cultivos/sensores/lecturas).

## 6. Cuatro gráficas adicionales (nuevo, a petición del usuario)

Todas calculadas en frontend, sin backend nuevo. Se usa `AreaChart` de recharts para las 3 tendencias en el tiempo (para distinguirlas visualmente de los `BarChart` de distribución ya existentes):

1. **Tendencia de lecturas** (`LecturasResumen` en `LecturasPage.tsx`): nueva función `dashboardStatsService.getLecturasPorDia(fincaId, sensores, dias=7)` — por cada sensor de la finca, pide `lecturasService.getAll(fincaId, sensorId, {fechaDesde, fechaHasta}, 1, 500)` acotado a los últimos 7 días, agrupa por `fecha` (rellenando días sin lecturas con 0) y grafica `AreaChart` "Lecturas por día".
2. **Fincas registradas por mes** (`FincasResumen` en `FincasPage.tsx`): agrupa `allFincas` (ya cargado) por mes de `fechaRegistro`, `AreaChart`.
3. **Sensores creados por mes** (`SensoresResumen` en `SensoresPage.tsx`): agrupa `sensores` (ya cargado, scoped a la finca) por mes de `createdAt`, `AreaChart`, debajo del `BarChart` de "sensores por variable" existente.
4. **Resumen para Variables** (`VariablesPage.tsx`, único módulo CRUD sin pestaña Resumen): nueva función `dashboardStatsService.getSensoresPorVariableGlobal()` — recorre todas las fincas y sus sensores (patrón ya usado en `getResumenGeneral`) y cuenta sensores por nombre de variable a nivel global; `BarChart` "Sensores por variable" + tarjeta "Total variables", cargado lazy al entrar a la pestaña Resumen (mismo patrón lazy que `FincasResumen`).

## Archivos a tocar

- `yuca-frontend/src/router/RequirePermiso.tsx` (nuevo)
- `yuca-frontend/src/router/index.tsx` (envolver 4 rutas)
- `yuca-frontend/src/components/ui/Tabs.tsx` (nuevo) + `components/ui/index.ts`
- `yuca-frontend/src/pages/fincas/FincasPage.tsx`
- `yuca-frontend/src/pages/cultivos/CultivosPage.tsx`
- `yuca-frontend/src/pages/sensores/SensoresPage.tsx`
- `yuca-frontend/src/pages/lecturas/LecturasPage.tsx`
- `yuca-frontend/src/pages/dashboard/DashboardPage.tsx`
- `yuca-frontend/src/services/dashboard/dashboardStatsService.ts` (nuevo, helper de agregación compartido)

No se toca el backend (`yuca-backend`) ni `AuthContext`/`PrivateRoute`/`useAuth`/`DashboardLayout`.

Al aprobar este plan, se copia también como `yuca-frontend/PLAN.md` para que quede documentado dentro del repositorio (a petición explícita del usuario).

## Verificación

Con el dev server corriendo en `http://localhost:5173/`:
1. Login con un usuario con permisos completos → confirmar `/dashboard` muestra stats reales (fincas/cultivos/sensores/lecturas coherentes con lo que hay en cada módulo) y "Actividad reciente" muestra lecturas reales, no nombres inventados.
2. En cada módulo (`/dashboard/fincas`, `/cultivos`, `/sensores`, `/lecturas`), alternar pestaña Listado ↔ Resumen y verificar que las cifras/gráficas coinciden con los datos del Listado.
3. Con un usuario/rol sin permiso `ver` en, por ejemplo, `sensores` (usar `/dashboard/permisos` para quitarlo a un rol de prueba): confirmar que el link desaparece del sidebar (comportamiento ya existente) **y** que navegar manualmente a `/dashboard/sensores` redirige a `/dashboard` en vez de mostrar una página rota.
4. Confirmar que `/dashboard` sigue siendo accesible para cualquier usuario autenticado sin importar sus permisos de módulo (no se le agregó guard).
5. Revisar consola del navegador sin errores nuevos, y que las llamadas N+1 (lecturas por sensor) no dejen la UI colgada — mostrar loading state mientras agregan.
