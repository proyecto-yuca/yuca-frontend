# ANEXO 5. EJECUCIÓN DEL SEGUNDO PAQUETE DE PRUEBAS DEL APLICATIVO

---

## 1. Introducción

El avance progresivo en el desarrollo del sistema Yuca ha permitido incorporar nuevas capacidades funcionales que amplían significativamente el alcance operativo de la plataforma. En esta fase, el énfasis se desplaza desde los mecanismos de acceso y autenticación —validados en el primer paquete de pruebas— hacia la gestión de entidades de negocio centrales y la integración con fuentes de datos externas. Concretamente, se han implementado dos módulos de alta relevancia para los usuarios del sistema: la gestión de fincas, con todas las operaciones CRUD asociadas, y la visualización de lecturas provenientes de sensores IoT de humedad y temperatura instalados en cada finca.

La naturaleza de estos módulos impone condiciones de prueba distintas a las del paquete anterior. Por un lado, el módulo de gestión de fincas exige validar no solo la correcta ejecución de operaciones sobre datos, sino también la coherencia del estado de la interfaz a lo largo de flujos que involucran múltiples interacciones: creación, consulta paginada, edición, filtrado y cambio de estado. Esta complejidad operativa es mayor que la de los flujos de autenticación, dado que involucra estructuras de datos más ricas, validaciones en el cliente y retroalimentación contextual al usuario.

Por otro lado, el módulo de sensores introduce una dimensión diferente al proceso de pruebas: la simulación de un origen de datos asíncrono y periódico. Las lecturas de sensores representan información que, en un entorno productivo, sería transmitida de manera continua a través de la red por dispositivos físicos. Durante esta fase de desarrollo, este comportamiento se replica mediante un servicio mockeado con latencia simulada y generación determinista de datos, lo cual permite evaluar la respuesta de la interfaz ante condiciones de carga diferida y actualización dinámica de contenido.

La validación de estos dos módulos resulta estratégica no solo por su importancia funcional, sino porque representa el primer caso en el que el sistema gestiona datos de dominio directamente relacionados con las operaciones agrícolas que Yuca está diseñado para apoyar. En consecuencia, las pruebas de este paquete no se conciben únicamente como una verificación técnica, sino como un ejercicio de alineación entre las capacidades implementadas y los requerimientos operativos reales que el sistema deberá satisfacer en producción.

Este anexo documenta de manera sistemática la planificación, ejecución y análisis del segundo paquete de pruebas funcionales del aplicativo, estableciendo un punto de referencia claro para las siguientes iteraciones de desarrollo.

---

## 2. Objetivo del paquete de pruebas

El objetivo central de este paquete es verificar el correcto funcionamiento de los módulos de gestión de fincas y monitoreo de sensores IoT, evaluando tanto la integridad de las operaciones sobre datos como la consistencia del comportamiento de la interfaz ante flujos de uso reales. A diferencia del paquete anterior, centrado en la infraestructura de acceso, este conjunto de pruebas se orienta a validar la lógica de negocio del sistema y su capacidad para manejar datos estructurados con múltiples campos, estados y relaciones.

De manera específica, se plantean los siguientes objetivos:

- Verificar que el módulo de gestión de fincas permite ejecutar de forma correcta las operaciones de creación, consulta, edición e inactivación, garantizando que los datos se registren y actualicen de manera coherente y que la interfaz refleje estos cambios sin inconsistencias.
- Validar el comportamiento del sistema de paginación en el listado de fincas, confirmando que la navegación entre páginas opera correctamente y que los indicadores de cantidad y rango de registros son precisos.
- Comprobar que las validaciones del formulario de fincas operan adecuadamente en el cliente, impidiendo el envío de datos incompletos o incorrectos y proporcionando retroalimentación clara al usuario sobre los errores detectados.
- Evaluar el funcionamiento del módulo de sensores en lo relacionado con la carga de lecturas, la paginación de resultados, el filtrado por rango de fechas y por estado, y la correcta clasificación de las lecturas según los umbrales definidos.
- Verificar el mecanismo de actualización periódica de los datos de sensores, comprobando que el indicador de estado en línea y el contador de última actualización operan de acuerdo con lo esperado.
- Identificar comportamientos inesperados, inconsistencias visuales o problemas de usabilidad que, aunque no constituyan errores críticos, incidan en la calidad percibida del sistema.

En conjunto, estos objetivos buscan confirmar que el sistema es capaz de operar como herramienta de gestión agrícola en sus dimensiones básicas, proporcionando al usuario una experiencia coherente y predecible en el manejo de información de campo.

---

## 3. Alcance de las pruebas

El alcance del presente paquete de pruebas se delimita en función de los componentes implementados durante este ciclo de desarrollo. Las pruebas se concentran en dos módulos principales: la gestión de fincas y el monitoreo de sensores por finca. Ambos módulos se evalúan como flujos completos de interacción, considerando no solo las operaciones individuales, sino también las transiciones entre estados y la coherencia de la información presentada en la interfaz.

En el módulo de gestión de fincas se evalúan los siguientes componentes:

- Listado de fincas con paginación, incluyendo la correcta presentación de registros, la navegación entre páginas y la actualización del contador de resultados.
- Creación de fincas, validando tanto el flujo exitoso como el comportamiento del sistema ante datos incompletos o con formato incorrecto.
- Edición de fincas, verificando que los datos existentes se pre-cargan correctamente en el formulario y que las modificaciones se aplican sin afectar otros campos.
- Cambio de estado (inactivación y reactivación), confirmando el flujo de confirmación y la actualización visual del estado en el listado.
- Búsqueda y filtrado, evaluando la respuesta del sistema ante diferentes criterios de búsqueda y la consistencia del filtro por estado.
- Vista de detalle, comprobando que la información presentada en el modal de detalle es completa y coherente con los datos registrados.

En el módulo de sensores se evalúan:

- Carga de lecturas por finca, verificando que los datos se obtienen de manera correcta y se presentan organizados cronológicamente.
- Paginación de lecturas, confirmando el funcionamiento de la navegación y los indicadores de cantidad.
- Filtrado por rango de fechas y por estado de lectura, validando que los resultados corresponden a los criterios seleccionados.
- Resumen estadístico, comprobando que los indicadores de promedio, mínimo, máximo, alertas y críticos reflejan correctamente el conjunto de datos del período seleccionado.
- Mecanismo de actualización, evaluando el comportamiento del indicador de estado en línea y el funcionamiento del botón de actualización manual.

Quedan fuera del alcance de este paquete las pruebas de rendimiento bajo carga, la validación de integraciones con dispositivos físicos reales, las pruebas de seguridad avanzada y la verificación de funcionalidades aún no implementadas como la exportación de datos o la generación de reportes.

---

## 4. Entorno de pruebas

Las pruebas se ejecutaron en un entorno de desarrollo local que replica las condiciones básicas de operación del sistema. El frontend fue servido a través del servidor de desarrollo de Vite en el puerto 5173, lo que permitió evaluar la aplicación directamente en el navegador con recarga en caliente durante el proceso de validación.

Dado que en esta fase los módulos evaluados operan con datos simulados, no se requirió la configuración de un backend activo para la ejecución de la mayoría de los casos de prueba. El módulo de fincas y el de sensores utilizan servicios mockeados con latencia simulada —entre 200 y 600 milisegundos según la operación— que replican el comportamiento esperado de una API REST real. Este diseño facilita la validación funcional de la interfaz de manera independiente, permitiendo concentrar el análisis en el comportamiento del frontend sin introducir variables externas.

Para los casos de prueba que involucran el módulo de autenticación como condición previa —acceso al dashboard, navegación por rutas privadas—, se mantuvo activa la conexión con el backend, el cual fue ejecutado localmente. Las pruebas se realizaron con un usuario autenticado previamente, cuya sesión se mantuvo activa durante toda la ejecución del paquete.

Las pruebas se llevaron a cabo en los navegadores Google Chrome (versión 124) y Safari (macOS Sequoia), evaluando la coherencia del comportamiento en ambos entornos. No se identificaron diferencias significativas entre navegadores en relación con los flujos evaluados.

El equipo utilizado corresponde a una computadora personal con sistema operativo macOS Sequoia 15.2, con las dependencias del proyecto instaladas en su versión más reciente compatible. La generación de datos de sensores se realizó de manera determinista mediante una función de hash basada en el identificador de la finca y la fecha, lo que garantizó la reproducibilidad de los escenarios de prueba a lo largo de las diferentes sesiones de validación.

---

## 5. Metodología de pruebas

La metodología empleada en este paquete se basa en pruebas funcionales manuales estructuradas por escenarios, siguiendo el mismo enfoque adoptado en el primer paquete. No obstante, la mayor complejidad de los flujos evaluados en esta fase hizo necesario incorporar consideraciones adicionales en la definición de los casos de prueba, particularmente en lo relacionado con las precondiciones y el estado del sistema entre operaciones consecutivas.

Cada caso de prueba se documenta con la siguiente estructura:

- **ID:** identificador único del caso.
- **Descripción:** enunciado que precisa el flujo o la funcionalidad bajo evaluación.
- **Condición inicial:** estado del sistema y del contexto de datos previo a la ejecución de la prueba.
- **Acción:** descripción de la interacción del usuario con el sistema.
- **Resultado esperado:** comportamiento correcto que el sistema debería exhibir si la funcionalidad está implementada correctamente.
- **Resultado obtenido:** comportamiento real observado durante la ejecución.
- **Estado:** clasificación del resultado como *Aprobado*, *Parcial* o *Fallido*.

Para los casos que involucran operaciones sobre datos, se consideró como estado del sistema el conjunto de fincas presentes en el servicio mockeado al momento de la prueba. Dado que los datos se almacenan en memoria, las pruebas se ejecutaron en secuencia dentro de la misma sesión, lo que permitió evaluar el efecto acumulado de las operaciones sobre el estado del sistema.

En los flujos relacionados con el módulo de sensores, se prestó especial atención al comportamiento de la interfaz durante el período de carga diferida, evaluando la correcta presentación de los indicadores de carga y la transición hacia el estado con datos una vez completada la solicitud.

---

## 6. Casos de prueba ejecutados

### 6.1 Listado de fincas con paginación

| Campo | Detalle |
|---|---|
| **ID** | CP-01 |
| **Descripción** | Visualización del listado de fincas registradas con paginación activa |
| **Condición inicial** | Usuario autenticado, 8 fincas registradas en el sistema |
| **Acción** | Navegar a la sección de fincas y recorrer las páginas disponibles |
| **Resultado esperado** | Se muestran 6 fincas por página, el indicador de resultados refleja el total y rango correctos, los controles de paginación permiten navegar entre páginas |
| **Resultado obtenido** | El listado se presenta correctamente, la paginación opera con precisión y los contadores son exactos |
| **Estado** | Aprobado |

**Análisis:** El componente de paginación responde correctamente al total de registros disponibles. La presentación del rango "Mostrando X–Y de Z fincas" resulta informativa y reduce la ambigüedad sobre el contenido visible en pantalla.

---

### 6.2 Creación de finca con datos válidos

| Campo | Detalle |
|---|---|
| **ID** | CP-02 |
| **Descripción** | Registro exitoso de una nueva finca con todos los campos obligatorios completos |
| **Condición inicial** | Usuario autenticado, modal de creación cerrado |
| **Acción** | Abrir modal de creación, completar los campos de información de la finca, ubicación y dueño, confirmar creación |
| **Resultado esperado** | La finca se registra en el sistema, el modal se cierra, aparece un mensaje de confirmación y el nuevo registro es visible en el listado |
| **Resultado obtenido** | La finca se crea correctamente, el toast de confirmación aparece y el registro aparece al inicio del listado |
| **Estado** | Aprobado |

**Análisis:** El flujo de creación opera de manera fluida. La organización del formulario en tres secciones —información de la finca, ubicación y dueño— facilita el ingreso de datos y reduce la posibilidad de omisiones. El uso del modal con scroll interno resulta adecuado para la densidad de campos del formulario.

---

### 6.3 Validación de formulario ante datos incompletos

| Campo | Detalle |
|---|---|
| **ID** | CP-03 |
| **Descripción** | Intento de creación de finca sin completar los campos obligatorios |
| **Condición inicial** | Modal de creación abierto con campos vacíos |
| **Acción** | Intentar guardar la finca sin ingresar nombre, área, departamento, municipio, nombre del dueño, número de documento, correo y teléfono |
| **Resultado esperado** | El sistema bloquea el envío del formulario y muestra mensajes de error bajo cada campo incompleto o inválido |
| **Resultado obtenido** | Los mensajes de error se presentan correctamente bajo cada campo, el formulario no se envía |
| **Estado** | Aprobado |

**Análisis:** Las validaciones del cliente operan correctamente para todos los campos obligatorios. Se comprobó además que la validación del formato del correo electrónico detecta adecuadamente direcciones malformadas. Este comportamiento reduce la posibilidad de registrar datos de baja calidad.

---

### 6.4 Edición de finca existente

| Campo | Detalle |
|---|---|
| **ID** | CP-04 |
| **Descripción** | Modificación de los datos de una finca previamente registrada |
| **Condición inicial** | Al menos una finca activa en el sistema |
| **Acción** | Seleccionar la opción de edición en el listado, modificar nombre, área y teléfono del dueño, guardar cambios |
| **Resultado esperado** | El modal se abre con los datos actuales de la finca pre-cargados, los cambios se aplican correctamente y el listado refleja la información actualizada |
| **Resultado obtenido** | Los datos se pre-cargan sin omisiones, los cambios se guardan correctamente y el listado se actualiza |
| **Estado** | Aprobado |

**Análisis:** La pre-carga de datos en el formulario de edición opera de manera precisa, incluyendo campos opcionales como vereda, coordenadas y dirección del dueño. Este comportamiento evita que el usuario deba reingresar información que no desea modificar.

---

### 6.5 Vista de detalle de finca

| Campo | Detalle |
|---|---|
| **ID** | CP-05 |
| **Descripción** | Visualización completa de la información de una finca desde el modal de detalle |
| **Condición inicial** | Al menos una finca con todos los campos completos en el sistema |
| **Acción** | Seleccionar el botón de detalle en el listado |
| **Resultado esperado** | El modal muestra todos los datos de la finca organizados por sección, incluyendo información general, ubicación y datos del dueño |
| **Resultado obtenido** | La información se presenta correctamente, los campos opcionales vacíos no generan entradas vacías visibles |
| **Estado** | Aprobado |

**Análisis:** La organización del modal de detalle en secciones diferenciadas facilita la lectura de la información. La omisión de campos opcionales sin valor en la presentación es un comportamiento adecuado que evita mostrar datos sin contenido.

---

### 6.6 Inactivación de finca activa

| Campo | Detalle |
|---|---|
| **ID** | CP-06 |
| **Descripción** | Cambio de estado de una finca activa a inactiva mediante el flujo de confirmación |
| **Condición inicial** | Al menos una finca con estado activo en el listado visible |
| **Acción** | Seleccionar el botón de inactivación, confirmar la acción en el modal |
| **Resultado esperado** | La finca cambia su estado a inactivo, el badge en el listado se actualiza y aparece un mensaje de confirmación |
| **Resultado obtenido** | El estado cambia correctamente, el badge visual refleja el cambio de inmediato |
| **Estado** | Aprobado |

**Análisis:** El modal de confirmación previo a la inactivación es un mecanismo pertinente que reduce el riesgo de cambios accidentales. El mensaje descriptivo dentro del modal, que menciona explícitamente el nombre de la finca, contribuye a que el usuario tenga certeza sobre la acción que está ejecutando.

---

### 6.7 Reactivación de finca inactiva

| Campo | Detalle |
|---|---|
| **ID** | CP-07 |
| **Descripción** | Cambio de estado de una finca inactiva a activa |
| **Condición inicial** | Al menos una finca con estado inactivo en el listado |
| **Acción** | Seleccionar el botón de activación, confirmar la acción |
| **Resultado esperado** | La finca cambia su estado a activo y el badge se actualiza |
| **Resultado obtenido** | El estado se actualiza correctamente |
| **Estado** | Aprobado |

**Análisis:** El comportamiento es simétrico al de inactivación. Se verificó que el color del modal de confirmación cambia apropiadamente entre las dos acciones —rojo para inactivar, verde para activar—, lo que refuerza la distinción semántica entre ambas operaciones.

---

### 6.8 Búsqueda y filtrado de fincas

| Campo | Detalle |
|---|---|
| **ID** | CP-08 |
| **Descripción** | Búsqueda de fincas por nombre, dueño, municipio y departamento; filtrado por estado |
| **Condición inicial** | Múltiples fincas registradas con distintos estados y ubicaciones |
| **Acción** | Ingresar diferentes términos en el campo de búsqueda y seleccionar distintos valores en el filtro de estado |
| **Resultado esperado** | El listado se actualiza mostrando únicamente los registros que coinciden con los criterios aplicados; la paginación se reinicia al modificar los filtros |
| **Resultado obtenido** | Los filtros operan correctamente, la paginación se reinicia y el mensaje de "sin resultados" aparece cuando ninguna finca coincide con los criterios |
| **Estado** | Aprobado |

**Análisis:** La búsqueda en tiempo real sobre múltiples campos —nombre, dueño, municipio y departamento— resulta una capacidad útil que evita la necesidad de filtros combinados independientes. Se verificó que la paginación se reinicia correctamente al modificar cualquiera de los criterios de búsqueda.

---

### 6.9 Navegación al módulo de sensores desde el listado

| Campo | Detalle |
|---|---|
| **ID** | CP-09 |
| **Descripción** | Acceso a la vista de sensores de una finca específica desde el listado principal |
| **Condición inicial** | Usuario en el listado de fincas |
| **Acción** | Seleccionar el botón de sensores en una fila del listado |
| **Resultado esperado** | El sistema navega a la vista de sensores de la finca seleccionada, mostrando el breadcrumb de navegación con el nombre de la finca |
| **Resultado obtenido** | La navegación opera correctamente, el breadcrumb refleja la ruta completa y el nombre de la finca se carga de manera asíncrona |
| **Estado** | Aprobado |

**Análisis:** El breadcrumb proporciona un contexto claro sobre la ubicación del usuario dentro del sistema. La carga asíncrona del nombre de la finca, visible brevemente como un esqueleto animado antes de resolverse, es un comportamiento correcto y no genera desorientación.

---

### 6.10 Carga y visualización de lecturas de sensores

| Campo | Detalle |
|---|---|
| **ID** | CP-10 |
| **Descripción** | Visualización de lecturas históricas de sensores de humedad y temperatura de una finca |
| **Condición inicial** | Usuario en la vista de sensores de una finca con datos generados |
| **Acción** | Cargar la vista sin modificar los filtros por defecto (últimos 30 días) |
| **Resultado esperado** | Se muestran 10 lecturas por página ordenadas cronológicamente (más reciente primero), con los indicadores de humedad y temperatura visibles para cada entrada |
| **Resultado obtenido** | Las lecturas se cargan correctamente tras la latencia simulada, el skeleton de carga aparece durante la espera y la tabla se presenta completa al resolverse |
| **Estado** | Aprobado |

**Análisis:** El skeleton de carga durante el período de latencia simulada comunica adecuadamente al usuario que el sistema está procesando la solicitud. La barra visual de humedad, codificada por color según el rango de valores, facilita la lectura rápida de los datos sin necesidad de interpretar los valores numéricos individualmente.

---

### 6.11 Paginación de lecturas de sensores

| Campo | Detalle |
|---|---|
| **ID** | CP-11 |
| **Descripción** | Navegación entre páginas de lecturas de sensores |
| **Condición inicial** | Vista de sensores con más de 10 lecturas en el período seleccionado |
| **Acción** | Navegar a páginas posteriores usando los controles de paginación |
| **Resultado esperado** | Las lecturas de cada página son coherentes con el orden cronológico, los controles de navegación se habilitan y deshabilitan según corresponda |
| **Resultado obtenido** | La paginación opera correctamente, el rango de registros mostrado en el pie de la tabla es preciso |
| **Estado** | Aprobado |

**Análisis:** El comportamiento de la paginación es consistente con el del módulo de fincas. Se verificó que al cambiar cualquier filtro la paginación regresa a la primera página, evitando estados incoherentes donde el número de página activo supera el total de páginas disponibles con los nuevos criterios.

---

### 6.12 Filtrado de lecturas por rango de fechas

| Campo | Detalle |
|---|---|
| **ID** | CP-12 |
| **Descripción** | Aplicación de filtros de fecha inicio y fecha fin sobre el listado de lecturas |
| **Condición inicial** | Vista de sensores con el rango por defecto de 30 días activo |
| **Acción** | Modificar la fecha de inicio y la fecha de fin para reducir el período a una semana; usar el atajo "Solo hoy" |
| **Resultado esperado** | El listado se actualiza mostrando únicamente las lecturas dentro del período seleccionado; el resumen estadístico refleja los valores del conjunto completo de datos de la finca |
| **Resultado obtenido** | El filtro por fechas opera correctamente; el atajo "Solo hoy" establece ambos extremos del rango en la fecha actual |
| **Estado** | Aprobado |

**Análisis:** La separación entre el resumen estadístico —calculado siempre sobre el conjunto total de datos de la finca— y el listado filtrado —que refleja el período seleccionado— es una decisión de diseño adecuada. Permite al usuario comparar el comportamiento del período analizado frente al histórico global sin necesidad de limpiar los filtros.

---

### 6.13 Filtrado de lecturas por estado

| Campo | Detalle |
|---|---|
| **ID** | CP-13 |
| **Descripción** | Filtrado del listado de lecturas por estado: normal, alerta y crítico |
| **Condición inicial** | Vista de sensores con datos que incluyen los tres estados posibles |
| **Acción** | Seleccionar cada uno de los estados disponibles en el filtro y verificar los resultados |
| **Resultado esperado** | Solo se muestran las lecturas correspondientes al estado seleccionado; el estado "todos" restaura el listado completo |
| **Resultado obtenido** | El filtro por estado opera correctamente; las lecturas críticas presentan el fondo de fila en rojo pálido y las de alerta en ámbar |
| **Estado** | Aprobado |

**Análisis:** La diferenciación cromática de las filas según el estado —crítico en rojo, alerta en ámbar— proporciona una señal visual preattentiva que permite identificar anomalías sin necesidad de leer el badge de estado. Este elemento de diseño resulta particularmente útil en el contexto de monitoreo agrícola, donde la detección rápida de condiciones fuera de rango tiene implicaciones directas sobre los cultivos.

---

### 6.14 Actualización manual de datos de sensores

| Campo | Detalle |
|---|---|
| **ID** | CP-14 |
| **Descripción** | Actualización forzada de las lecturas mediante el botón de refresh manual |
| **Condición inicial** | Vista de sensores con datos cargados |
| **Acción** | Seleccionar el botón de actualización manual |
| **Resultado esperado** | El sistema ejecuta una nueva solicitud, el botón muestra el estado "Actualizando…" durante la latencia y el indicador de última actualización se renueva al completarse |
| **Resultado obtenido** | El comportamiento es el esperado; el spinner en el botón y el texto "Actualizando…" comunican claramente el estado de la operación |
| **Estado** | Aprobado |

**Análisis:** El indicador de tiempo transcurrido desde la última actualización —"Hace Xs" / "Hace X min"— proporciona al usuario información contextual sobre la frescura de los datos sin requerir interacción adicional. Este patrón es especialmente relevante en sistemas de monitoreo donde la antigüedad del dato condiciona la validez de las decisiones que se toman a partir de él.

---

### 6.15 Indicador de estado en línea y auto-refresh

| Campo | Detalle |
|---|---|
| **ID** | CP-15 |
| **Descripción** | Verificación del comportamiento del indicador "En línea" y el mecanismo de actualización automática cada 60 segundos |
| **Condición inicial** | Vista de sensores activa |
| **Acción** | Mantener la vista abierta durante más de un minuto sin interacción |
| **Resultado esperado** | El indicador "En línea" permanece activo con su animación de ping; pasados 60 segundos el sistema ejecuta una actualización silenciosa y renueva el contador de última actualización |
| **Resultado obtenido** | El auto-refresh se ejecuta según el intervalo configurado; el proceso es transparente para el usuario salvo por la actualización del contador |
| **Estado** | Aprobado |

**Análisis:** El auto-refresh silencioso es un mecanismo pertinente para un módulo de monitoreo, ya que garantiza que los datos presentados no envejezcan de manera indefinida durante sesiones largas. La ausencia de interrupciones visuales durante el proceso —a diferencia de una recarga completa— contribuye a una experiencia de uso continua y no disruptiva.

---

## 7. Resultados y análisis general

Los resultados obtenidos a partir de la ejecución del segundo paquete de pruebas evidencian que los módulos de gestión de fincas y monitoreo de sensores han sido implementados con un nivel de madurez adecuado para esta etapa del desarrollo. La totalidad de los casos de prueba definidos arrojó un estado de aprobado, lo que indica que los flujos principales operan de manera coherente y que la interfaz responde de forma predecible ante los distintos escenarios de interacción evaluados.

En lo relacionado con el módulo de fincas, destaca positivamente la robustez del ciclo completo de gestión: creación, consulta, edición, cambio de estado y búsqueda operan de manera integrada, sin inconsistencias en el estado de la interfaz ni pérdidas de información entre operaciones. El formulario multi-sección constituye una solución adecuada para la complejidad del modelo de datos de una finca, que involucra información general, ubicación detallada e información del propietario. Las validaciones del cliente, por su parte, operan correctamente y proporcionan retroalimentación pertinente al usuario.

En cuanto al módulo de sensores, los resultados confirman que el patrón de carga diferida con skeleton, combinado con el mecanismo de auto-refresh y el indicador de estado en línea, proporciona una experiencia consistente con lo esperado en aplicaciones de monitoreo en tiempo real. La clasificación automática de lecturas por estado —normal, alerta, crítico— y su representación visual diferenciada representan una contribución significativa a la usabilidad del módulo, dado que permiten identificar anomalías de manera inmediata sin necesidad de interpretar los valores numéricos.

No obstante, el análisis detallado de la ejecución permite identificar algunos aspectos que merecen atención en las siguientes iteraciones:

- **Persistencia de datos entre sesiones:** dado que los datos de fincas se almacenan en memoria durante la sesión de desarrollo, la recarga de la aplicación restablece el estado inicial. Si bien esto es un comportamiento esperado en el contexto de una implementación mockeada, deberá ser reemplazado por una integración real con el backend antes de que el módulo sea utilizado en condiciones productivas.
- **Retroalimentación ante errores del servicio:** los casos de prueba se ejecutaron en condiciones de funcionamiento normal del servicio mockeado. En escenarios donde la solicitud falla —por ejemplo, por un error de red en el sistema real—, la interfaz muestra un mensaje genérico. Sería recomendable enriquecer estos mensajes con información más específica sobre la naturaleza del error y las acciones que el usuario puede tomar.
- **Accesibilidad del formulario en pantallas pequeñas:** durante la prueba en resoluciones reducidas, el formulario de creación/edición, que contiene un número significativo de campos, requiere un desplazamiento considerable dentro del modal. Si bien el comportamiento es funcional, podría beneficiarse de una reorganización de pasos o secciones colapsables para mejorar la experiencia en dispositivos móviles.
- **Ausencia de confirmación antes de cerrar el modal con cambios pendientes:** si el usuario ha ingresado datos en el formulario y cierra el modal sin guardar, los datos se pierden sin ningún aviso previo. Incorporar un diálogo de confirmación en este escenario reduciría el riesgo de pérdida accidental de información.

En conjunto, estos hallazgos no comprometen la funcionalidad del sistema, pero señalan oportunidades de mejora que inciden directamente en la calidad de la experiencia de usuario y en la robustez del sistema ante escenarios de uso no ideales.

---

## 8. Hallazgos relevantes

La ejecución de este paquete de pruebas permitió identificar un conjunto de hallazgos que, más allá de los resultados directos de cada caso, aportan información valiosa sobre el estado de los módulos evaluados y sobre decisiones de diseño que merecen ser revisadas en iteraciones posteriores.

El hallazgo más relevante desde el punto de vista funcional es la dependencia del módulo de fincas con el estado en memoria de la aplicación. En el contexto actual de desarrollo, este comportamiento es deliberado y permite validar la interfaz de manera independiente del backend. Sin embargo, introduce una asimetría importante entre el comportamiento esperado en producción —donde los datos persisten en una base de datos— y el observado durante las pruebas. Esta distinción debe quedar documentada con claridad para evitar malinterpretaciones al momento de incorporar la integración real con la API.

Otro hallazgo significativo se refiere a la generación determinista de datos de sensores. Si bien este mecanismo garantiza la reproducibilidad de los escenarios de prueba, también implica que los datos generados son predecibles y no capturan la variabilidad real que podría presentarse en lecturas provenientes de dispositivos físicos. En particular, patrones como oscilaciones rápidas entre estados, lecturas fuera de rango consecutivas o fallas de conectividad del sensor no están representados en el modelo de generación actual. Estos escenarios deberán ser considerados en la etapa de integración con los dispositivos IoT reales.

En relación con la interfaz de usuario, se identificó que los elementos de estado —badge de finca activa/inactiva, estado de lectura de sensor— presentan una codificación visual clara y coherente. No obstante, se observó que en resoluciones intermedias algunas columnas de la tabla de fincas se ocultan de manera progresiva sin que el usuario tenga una forma explícita de acceder a esa información oculta desde el contexto del listado. Este comportamiento, si bien es una práctica común en diseño responsivo, podría complementarse con la posibilidad de ver todos los datos a través del modal de detalle, enlace que ya existe pero cuya conexión semántica con la información oculta podría hacerse más evidente.

Finalmente, se evidenció que la sección de referencia de umbrales —presente al pie de la vista de sensores— constituye un elemento de valor para el usuario final, ya que explicita los criterios bajo los cuales se clasifican las lecturas. Este tipo de documentación contextual integrada en la interfaz reduce la necesidad de formación previa del usuario y contribuye a la autonomía en el uso del sistema.

---

## 9. Conclusiones

La ejecución del segundo paquete de pruebas del sistema Yuca confirma que los módulos de gestión de fincas y monitoreo de sensores han sido implementados con un nivel de coherencia funcional satisfactorio para esta etapa del proyecto. La totalidad de los casos de prueba definidos arrojó resultados aprobados, lo que valida tanto la lógica de negocio implementada como las decisiones de diseño de la interfaz adoptadas en este ciclo de desarrollo.

En el módulo de gestión de fincas, la implementación del ciclo CRUD completo —con paginación, búsqueda, filtrado y cambio de estado— proporciona las capacidades básicas que los usuarios del sistema requerirán para administrar su información de campo. La organización del formulario en secciones temáticas, la validación en el cliente y los mecanismos de confirmación para operaciones críticas como la inactivación constituyen decisiones acertadas que contribuyen a reducir la posibilidad de errores operativos.

En el módulo de sensores, la combinación de un patrón de carga diferida, un mecanismo de actualización periódica y una clasificación visual inmediata de los estados de las lecturas configura una experiencia de monitoreo funcional y orientada a la detección rápida de anomalías. Estos elementos son especialmente relevantes en el contexto agrícola de Yuca, donde las condiciones de humedad y temperatura tienen implicaciones directas sobre la salud de los cultivos.

Sin embargo, las conclusiones de este paquete también ponen de manifiesto que el sistema se encuentra en una etapa de transición entre una implementación basada en datos simulados y una integración real con el backend y con dispositivos físicos. Los módulos evaluados han demostrado ser sólidos como base, pero su paso a un entorno productivo requerirá atender aspectos como la persistencia de datos, el manejo robusto de errores de red, la variabilidad real de los datos de sensores y la seguridad en la gestión de información sensible de los propietarios de fincas.

Desde una perspectiva de proceso, los resultados de este paquete confirman el valor de incorporar implementaciones mockeadas en fases tempranas del desarrollo: permiten validar la interfaz y la lógica de presentación de manera independiente, reducen las dependencias entre equipos de desarrollo y facilitan la identificación de problemas de usabilidad antes de que la complejidad de la integración real introduzca variables adicionales.

En consecuencia, el sistema Yuca demuestra avances concretos en la incorporación de funcionalidades de dominio, manteniendo la coherencia arquitectónica validada en el paquete anterior. Las mejoras identificadas en este proceso constituyen insumos directos para la planificación de la siguiente iteración, orientada a la integración progresiva con el backend y la preparación del sistema para condiciones de uso real.

---

*Documento generado en el contexto del desarrollo del sistema Yuca · Segundo paquete de pruebas funcionales · Abril 2026*
