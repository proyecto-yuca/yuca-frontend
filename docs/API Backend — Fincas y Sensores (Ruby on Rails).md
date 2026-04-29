# Backend API — Yuca · Módulos de Fincas y Sensores

Referencia de endpoints requeridos para integrar el frontend de Yuca con un backend Ruby on Rails.
Cada contrato está derivado directamente de los servicios mockeados del frontend.

---

## Índice

1. [Configuración general](#1-configuración-general)
2. [Modelos y migraciones sugeridas](#2-modelos-y-migraciones-sugeridas)
3. [Rutas](#3-rutas)
4. [Módulo Fincas](#4-módulo-fincas)
   - [GET /api/v1/fincas](#41-get-apiv1fincas)
   - [POST /api/v1/fincas](#42-post-apiv1fincas)
   - [GET /api/v1/fincas/:id](#43-get-apiv1fincasid)
   - [PATCH /api/v1/fincas/:id](#44-patch-apiv1fincasid)
   - [PATCH /api/v1/fincas/:id/estado](#45-patch-apiv1fincasidestado)
5. [Módulo Sensores](#5-módulo-sensores)
   - [GET /api/v1/fincas/:finca_id/lecturas](#51-get-apiv1fincasfinca_idlecturas)
   - [GET /api/v1/fincas/:finca_id/lecturas/recientes](#52-get-apiv1fincasfinca_idlecturasrecientes)
   - [POST /api/v1/fincas/:finca_id/lecturas](#53-post-apiv1fincasfinca_idlecturas)
6. [Manejo de errores](#6-manejo-de-errores)
7. [Autenticación](#7-autenticación)
8. [Notas de implementación Rails](#8-notas-de-implementación-rails)

---

## 1. Configuración general

**Base URL:** `https://tu-dominio.com/api/v1`

**Headers requeridos en todas las peticiones autenticadas:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

**Formato de fechas:** `YYYY-MM-DD` (ISO 8601, sin hora).

**Paginación:** todas las respuestas de listado usan los query params `page` y `page_size` mediante la gema **pagy**.

**Búsqueda full-text:** la búsqueda en el módulo de fincas se implementa con la gema **pg_search** sobre PostgreSQL.

### Gemas requeridas

```ruby
# Gemfile
gem 'pagy'       # paginación ligera y sin dependencias
gem 'pg_search'  # búsqueda full-text sobre PostgreSQL
```

### Configuración de pagy

```ruby
# config/initializers/pagy.rb
require 'pagy/extras/headers'   # opcional: expone X-Pagy-* headers
require 'pagy/extras/overflow'  # devuelve última página si page > total_pages

Pagy::DEFAULT[:items] = 10      # page_size por defecto global
Pagy::DEFAULT[:overflow] = :last_page
```

Incluir el concern en los controllers que lo usen:

```ruby
# app/controllers/api/v1/base_controller.rb  (o ApplicationController)
include Pagy::Backend
```

---

## 2. Modelos y migraciones sugeridas

### Finca

```ruby
# db/migrate/XXXXXXXX_create_fincas.rb
create_table :fincas do |t|
  t.string  :nombre,              null: false
  t.text    :descripcion
  t.decimal :area,                null: false, precision: 10, scale: 2
  t.string  :estado,              null: false, default: 'activo'
  t.date    :fecha_registro,      null: false

  # Ubicación (embebida en la misma tabla)
  t.string  :departamento,        null: false
  t.string  :municipio,           null: false
  t.string  :vereda
  t.string  :coordenadas
  t.string  :direccion_ubicacion

  # Dueño (embebida en la misma tabla)
  t.string  :dueno_nombre,        null: false
  t.string  :dueno_tipo_documento, null: false  # CC | NIT | CE | PP
  t.string  :dueno_numero_documento, null: false
  t.string  :dueno_email,         null: false
  t.string  :dueno_telefono,      null: false
  t.string  :dueno_direccion

  t.references :user, null: false, foreign_key: true

  t.timestamps
end

add_index :fincas, :estado
add_index :fincas, :municipio
add_index :fincas, :departamento
add_index :fincas, [:user_id, :estado]
```

> **Nota:** ubicación y dueño se modelan como columnas planas en la tabla `fincas` dado que el frontend los trata como un objeto embebido sin identidad propia. Si en el futuro se requieren consultas complejas sobre propietarios (ej. fincas por dueño), evaluar normalizar `dueno` a una tabla separada.

### LecturaSensor

```ruby
# db/migrate/XXXXXXXX_create_lecturas_sensor.rb
create_table :lecturas_sensor do |t|
  t.references :finca,       null: false, foreign_key: true
  t.string     :sensor_id,   null: false
  t.date       :fecha,       null: false
  t.string     :hora_registro, null: false  # "06:00"
  t.decimal    :humedad,     null: false, precision: 5, scale: 1
  t.decimal    :temperatura, null: false, precision: 5, scale: 1
  t.string     :estado,      null: false   # normal | alerta | critico

  t.timestamps
end

add_index :lecturas_sensor, [:finca_id, :fecha]
add_index :lecturas_sensor, [:finca_id, :estado]
add_index :lecturas_sensor, [:finca_id, :fecha, :hora_registro], unique: true
```

### Modelo Finca

```ruby
# app/models/finca.rb
class Finca < ApplicationRecord
  include PgSearch::Model

  belongs_to :user
  has_many :lecturas_sensor, dependent: :destroy

  ESTADOS = %w[activo inactivo].freeze
  TIPOS_DOCUMENTO = %w[CC NIT CE PP].freeze

  # Búsqueda full-text sobre las cuatro columnas que usa el frontend
  pg_search_scope :buscar,
    against: {
      nombre:          'A',   # mayor peso
      municipio:       'B',
      departamento:    'B',
      dueno_nombre:    'C'
    },
    using: {
      tsearch: { prefix: true, dictionary: 'spanish' }
    }

  validates :nombre, presence: true, length: { maximum: 255 }
  validates :area, presence: true, numericality: { greater_than: 0 }
  validates :estado, inclusion: { in: ESTADOS }
  validates :departamento, :municipio, presence: true
  validates :dueno_nombre, :dueno_numero_documento,
            :dueno_email, :dueno_telefono, presence: true
  validates :dueno_tipo_documento, inclusion: { in: TIPOS_DOCUMENTO }
  validates :dueno_email, format: { with: URI::MailTo::EMAIL_REGEXP }

  before_create :set_fecha_registro

  scope :activas,   -> { where(estado: 'activo') }
  scope :inactivas, -> { where(estado: 'inactivo') }

  def toggle_estado!
    new_estado = activo? ? 'inactivo' : 'activo'
    update!(estado: new_estado)
  end

  def activo?
    estado == 'activo'
  end

  private

  def set_fecha_registro
    self.fecha_registro ||= Date.today
  end
end
```

### Modelo LecturaSensor

```ruby
# app/models/lectura_sensor.rb
class LecturaSensor < ApplicationRecord
  belongs_to :finca

  ESTADOS = %w[normal alerta critico].freeze

  validates :sensor_id, :fecha, :hora_registro, presence: true
  validates :humedad, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :temperatura, numericality: true
  validates :estado, inclusion: { in: ESTADOS }

  before_validation :calcular_estado

  scope :en_rango, ->(desde, hasta) { where(fecha: desde..hasta) }
  scope :por_estado, ->(estado) { where(estado: estado) unless estado == 'todos' }
  scope :recientes, -> { where(fecha: Date.today) }
  scope :cronologico_desc, -> { order(fecha: :desc, hora_registro: :desc) }

  private

  def calcular_estado
    return unless humedad && temperatura

    hum_critico  = humedad < 30    || humedad > 90
    temp_critico = temperatura < 5  || temperatura > 38
    hum_alerta   = humedad < 40    || humedad > 80
    temp_alerta  = temperatura < 10 || temperatura > 33

    self.estado = if hum_critico || temp_critico then 'critico'
                 elsif hum_alerta || temp_alerta  then 'alerta'
                 else                                  'normal'
                 end
  end
end
```

---

## 3. Rutas

```ruby
# config/routes.rb
namespace :api do
  namespace :v1 do
    # Fincas CRUD
    resources :fincas, only: [:index, :show, :create, :update] do
      member do
        patch :estado   # PATCH /api/v1/fincas/:id/estado
      end

      # Lecturas de sensores anidadas
      resources :lecturas, controller: 'lecturas_sensor', only: [:index, :create] do
        collection do
          get :recientes  # GET /api/v1/fincas/:finca_id/lecturas/recientes
        end
      end
    end
  end
end
```

---

## 4. Módulo Fincas

### 4.1 GET /api/v1/fincas

Lista paginada de fincas con búsqueda y filtro por estado.

**Query params:**

| Parámetro   | Tipo    | Requerido | Descripción |
|-------------|---------|-----------|-------------|
| `page`      | integer | No (def. 1) | Número de página |
| `page_size` | integer | No (def. 6) | Registros por página |
| `search`    | string  | No        | Busca en nombre, municipio, departamento y nombre del dueño |
| `estado`    | string  | No        | `activo`, `inactivo` o `todos` (defecto: `todos`) |

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "1",
      "nombre": "Finca El Paraíso",
      "descripcion": "Terreno con buena irrigación natural.",
      "area": 12.5,
      "ubicacion": {
        "departamento": "Cundinamarca",
        "municipio": "Fusagasugá",
        "vereda": "El Jordán",
        "coordenadas": "4.3372° N, 74.3641° W",
        "direccion": "Vereda El Jordán, km 3 vía Silvania"
      },
      "dueno": {
        "nombre": "Carlos Alberto Ramírez",
        "tipoDocumento": "CC",
        "numeroDocumento": "79456123",
        "email": "carlos.ramirez@email.com",
        "telefono": "3001234567",
        "direccion": "Calle 12 #45-23, Fusagasugá"
      },
      "estado": "activo",
      "fechaRegistro": "2024-03-15"
    }
  ],
  "total": 8,
  "page": 1,
  "pageSize": 6,
  "totalPages": 2
}
```

**Controller:**
```ruby
# app/controllers/api/v1/fincas_controller.rb
def index
  fincas = current_user.fincas

  fincas = fincas.buscar(params[:search]) if params[:search].present?

  if params[:estado].present? && params[:estado] != 'todos'
    fincas = fincas.where(estado: params[:estado])
  end

  fincas = fincas.order(created_at: :desc)

  page_size = [[params.fetch(:page_size, 6).to_i, 1].max, 100].min
  pagy, records = pagy(fincas, items: page_size, page: params[:page])

  render json: {
    data:       records.map { |f| serialize_finca(f) },
    total:      pagy.count,
    page:       pagy.page,
    pageSize:   pagy.items,
    totalPages: pagy.pages
  }
end
```

---

### 4.2 POST /api/v1/fincas

Crea una nueva finca. El `estado` siempre inicia en `activo` y `fechaRegistro` es la fecha del servidor.

**Body:**
```json
{
  "nombre": "Finca El Paraíso",
  "descripcion": "Descripción opcional",
  "area": 12.5,
  "ubicacion": {
    "departamento": "Cundinamarca",
    "municipio": "Fusagasugá",
    "vereda": "El Jordán",
    "coordenadas": "4.3372° N, 74.3641° W",
    "direccion": "Vereda El Jordán, km 3 vía Silvania"
  },
  "dueno": {
    "nombre": "Carlos Alberto Ramírez",
    "tipoDocumento": "CC",
    "numeroDocumento": "79456123",
    "email": "carlos.ramirez@email.com",
    "telefono": "3001234567",
    "direccion": "Calle 12 #45-23, Fusagasugá"
  }
}
```

**Campos obligatorios:** `nombre`, `area`, `ubicacion.departamento`, `ubicacion.municipio`,
`dueno.nombre`, `dueno.tipoDocumento`, `dueno.numeroDocumento`, `dueno.email`, `dueno.telefono`.

**Respuesta 201:** el objeto `Finca` completo con `id`, `estado: "activo"` y `fechaRegistro` asignados.

**Respuesta 422:** ver [sección de errores](#6-manejo-de-errores).

**Controller:**
```ruby
def create
  finca = current_user.fincas.build(finca_params)
  if finca.save
    render json: serialize_finca(finca), status: :created
  else
    render json: { errors: finca.errors }, status: :unprocessable_entity
  end
end

private

def finca_params
  params.require(:finca).permit(
    :nombre, :descripcion, :area,
    ubicacion: [:departamento, :municipio, :vereda, :coordenadas, :direccion],
    dueno:     [:nombre, :tipoDocumento, :numeroDocumento, :email, :telefono, :direccion]
  ).then { |p| flatten_nested_params(p) }
end

# Convierte los objetos anidados del JSON a columnas planas del modelo
def flatten_nested_params(p)
  result = p.except(:ubicacion, :dueno).to_h

  if p[:ubicacion]
    result[:departamento]       = p[:ubicacion][:departamento]
    result[:municipio]          = p[:ubicacion][:municipio]
    result[:vereda]             = p[:ubicacion][:vereda]
    result[:coordenadas]        = p[:ubicacion][:coordenadas]
    result[:direccion_ubicacion] = p[:ubicacion][:direccion]
  end

  if p[:dueno]
    result[:dueno_nombre]           = p[:dueno][:nombre]
    result[:dueno_tipo_documento]   = p[:dueno][:tipoDocumento]
    result[:dueno_numero_documento] = p[:dueno][:numeroDocumento]
    result[:dueno_email]            = p[:dueno][:email]
    result[:dueno_telefono]         = p[:dueno][:telefono]
    result[:dueno_direccion]        = p[:dueno][:direccion]
  end

  result
end
```

---

### 4.3 GET /api/v1/fincas/:id

Retorna el detalle completo de una finca.

**Respuesta 200:** objeto `Finca` completo (mismo shape que cada elemento del array en el listado).

**Respuesta 404:**
```json
{ "error": "Finca no encontrada" }
```

**Controller:**
```ruby
def show
  render json: serialize_finca(@finca)
end
```

---

### 4.4 PATCH /api/v1/fincas/:id

Actualiza los datos de una finca existente. Acepta exactamente el mismo body que `POST`. No modifica `estado` ni `fechaRegistro`.

**Respuesta 200:** objeto `Finca` actualizado.

**Respuesta 404 / 422:** según corresponda.

**Controller:**
```ruby
def update
  if @finca.update(finca_params)
    render json: serialize_finca(@finca)
  else
    render json: { errors: @finca.errors }, status: :unprocessable_entity
  end
end
```

---

### 4.5 PATCH /api/v1/fincas/:id/estado

Alterna el estado de la finca entre `activo` e `inactivo`. No requiere body.

**Respuesta 200:** objeto `Finca` con el estado actualizado.

**Respuesta 404:** si la finca no existe o no pertenece al usuario.

**Controller:**
```ruby
def estado
  @finca.toggle_estado!
  render json: serialize_finca(@finca)
rescue ActiveRecord::RecordInvalid => e
  render json: { errors: e.record.errors }, status: :unprocessable_entity
end
```

---

### Serializer de Finca

El frontend espera el JSON con las claves en **camelCase** tal como están en los tipos TypeScript.

```ruby
# app/controllers/api/v1/fincas_controller.rb (método privado)
def serialize_finca(finca)
  {
    id:            finca.id.to_s,
    nombre:        finca.nombre,
    descripcion:   finca.descripcion,
    area:          finca.area.to_f,
    ubicacion: {
      departamento: finca.departamento,
      municipio:    finca.municipio,
      vereda:       finca.vereda,
      coordenadas:  finca.coordenadas,
      direccion:    finca.direccion_ubicacion
    },
    dueno: {
      nombre:          finca.dueno_nombre,
      tipoDocumento:   finca.dueno_tipo_documento,
      numeroDocumento: finca.dueno_numero_documento,
      email:           finca.dueno_email,
      telefono:        finca.dueno_telefono,
      direccion:       finca.dueno_direccion
    },
    estado:        finca.estado,
    fechaRegistro: finca.fecha_registro.to_s
  }
end
```

> Si el proyecto usa **ActiveModelSerializers** o **jsonapi-serializer**, extraer este método a un serializer dedicado.

---

## 5. Módulo Sensores

### 5.1 GET /api/v1/fincas/:finca_id/lecturas

Lista paginada de lecturas con filtros. La respuesta incluye **siempre** el resumen estadístico calculado sobre el **total histórico** de la finca, independientemente de los filtros aplicados al listado.

**Query params:**

| Parámetro     | Tipo   | Requerido | Descripción |
|---------------|--------|-----------|-------------|
| `page`        | integer | No (def. 1) | Número de página |
| `page_size`   | integer | No (def. 10) | Registros por página |
| `fecha_desde` | string  | No        | Fecha inicio del rango `YYYY-MM-DD` |
| `fecha_hasta` | string  | No        | Fecha fin del rango `YYYY-MM-DD` |
| `estado`      | string  | No        | `normal`, `alerta`, `critico` o `todos` |

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "1-2024-04-28-0",
      "fincaId": "1",
      "fecha": "2024-04-28",
      "horaRegistro": "20:00",
      "sensorId": "SHT-3x-A",
      "humedad": 67.4,
      "temperatura": 22.1,
      "estado": "normal"
    }
  ],
  "total": 120,
  "page": 1,
  "pageSize": 10,
  "totalPages": 12,
  "resumen": {
    "totalLecturas": 360,
    "humedadPromedio": 68.2,
    "temperaturaPromedio": 22.5,
    "humedadMin": 31.0,
    "humedadMax": 97.4,
    "temperaturaMin": 9.8,
    "temperaturaMax": 38.6,
    "alertas": 24,
    "criticos": 5,
    "ultimaLectura": "2024-04-28 20:00"
  }
}
```

**Controller:**
```ruby
# app/controllers/api/v1/lecturas_sensor_controller.rb
def index
  finca    = current_user.fincas.find(params[:finca_id])
  lecturas = finca.lecturas_sensor.cronologico_desc

  lecturas = lecturas.en_rango(params[:fecha_desde], params[:fecha_hasta]) if
    params[:fecha_desde].present? && params[:fecha_hasta].present?

  lecturas = lecturas.where(estado: params[:estado]) if
    params[:estado].present? && params[:estado] != 'todos'

  page_size = [[params.fetch(:page_size, 10).to_i, 1].max, 100].min
  pagy, records = pagy(lecturas, items: page_size, page: params[:page])

  render json: {
    data:       records.map { |l| serialize_lectura(l) },
    total:      pagy.count,
    page:       pagy.page,
    pageSize:   pagy.items,
    totalPages: pagy.pages,
    resumen:    build_resumen(finca)
  }
end

private

def build_resumen(finca)
  todas = finca.lecturas_sensor
  return empty_resumen if todas.empty?

  ultima = todas.order(fecha: :desc, hora_registro: :desc).first

  {
    totalLecturas:        todas.count,
    humedadPromedio:      todas.average(:humedad).round(1),
    temperaturaPromedio:  todas.average(:temperatura).round(1),
    humedadMin:           todas.minimum(:humedad),
    humedadMax:           todas.maximum(:humedad),
    temperaturaMin:       todas.minimum(:temperatura),
    temperaturaMax:       todas.maximum(:temperatura),
    alertas:              todas.where(estado: 'alerta').count,
    criticos:             todas.where(estado: 'critico').count,
    ultimaLectura:        ultima ? "#{ultima.fecha} #{ultima.hora_registro}" : nil
  }
end

def empty_resumen
  {
    totalLecturas: 0, humedadPromedio: 0, temperaturaPromedio: 0,
    humedadMin: 0, humedadMax: 0, temperaturaMin: 0, temperaturaMax: 0,
    alertas: 0, criticos: 0, ultimaLectura: nil
  }
end
```

---

### 5.2 GET /api/v1/fincas/:finca_id/lecturas/recientes

Retorna únicamente las lecturas del día actual. Usado por el mecanismo de auto-refresh del frontend.

**Respuesta 200:**
```json
[
  {
    "id": "1-2024-04-29-0",
    "fincaId": "1",
    "fecha": "2024-04-29",
    "horaRegistro": "06:00",
    "sensorId": "DHT-22",
    "humedad": 65.3,
    "temperatura": 21.8,
    "estado": "normal"
  }
]
```

**Controller:**
```ruby
def recientes
  finca = current_user.fincas.find(params[:finca_id])
  lecturas = finca.lecturas_sensor.recientes.cronologico_desc
  render json: lecturas.map { |l| serialize_lectura(l) }
end
```

---

### 5.3 POST /api/v1/fincas/:finca_id/lecturas

Ingesta de una nueva lectura desde un sensor físico o desde un gateway IoT. El campo `estado` **no** se envía en el body: el servidor lo calcula mediante el callback `before_validation` del modelo.

**Body:**
```json
{
  "sensorId": "SHT-3x-A",
  "fecha": "2024-04-29",
  "horaRegistro": "11:00",
  "humedad": 78.5,
  "temperatura": 24.3
}
```

**Respuesta 201:** objeto `LecturaSensor` completo con `estado` calculado.

**Respuesta 422:** errores de validación.

**Controller:**
```ruby
def create
  finca   = current_user.fincas.find(params[:finca_id])
  lectura = finca.lecturas_sensor.build(lectura_params)

  if lectura.save
    render json: serialize_lectura(lectura), status: :created
  else
    render json: { errors: lectura.errors }, status: :unprocessable_entity
  end
end

private

def lectura_params
  params.require(:lectura).permit(:sensor_id, :fecha, :hora_registro,
                                  :humedad, :temperatura)
        .transform_keys { |k| k.to_s.underscore }
end
```

### Serializer de LecturaSensor

```ruby
def serialize_lectura(lectura)
  {
    id:           lectura.id.to_s,
    fincaId:      lectura.finca_id.to_s,
    fecha:        lectura.fecha.to_s,
    horaRegistro: lectura.hora_registro,
    sensorId:     lectura.sensor_id,
    humedad:      lectura.humedad.to_f,
    temperatura:  lectura.temperatura.to_f,
    estado:       lectura.estado
  }
end
```

---

## 6. Manejo de errores

El frontend maneja dos códigos de error relevantes: `404` para recurso no encontrado y `422` para errores de validación.

**404 — Recurso no encontrado:**
```json
{ "error": "Finca no encontrada" }
```

**422 — Errores de validación:**
```json
{
  "errors": {
    "nombre":        ["no puede estar en blanco"],
    "area":          ["debe ser mayor que 0"],
    "dueno_email":   ["no tiene un formato válido"]
  }
}
```

**Implementación centralizada en ApplicationController:**
```ruby
# app/controllers/application_controller.rb
rescue_from ActiveRecord::RecordNotFound do |e|
  render json: { error: 'Recurso no encontrado' }, status: :not_found
end

rescue_from ActionController::ParameterMissing do |e|
  render json: { error: e.message }, status: :bad_request
end
```

**Before action compartido:**
```ruby
# En Api::V1::FincasController
before_action :set_finca, only: [:show, :update, :estado]

def set_finca
  @finca = current_user.fincas.find(params[:id])
rescue ActiveRecord::RecordNotFound
  render json: { error: 'Finca no encontrada' }, status: :not_found
end
```

---

## 7. Autenticación

Todos los endpoints de los módulos de fincas y sensores requieren un `Bearer token` válido en el header `Authorization`. El mecanismo es el mismo JWT ya implementado en el backend para los módulos de autenticación existentes.

El `current_user` se resuelve en `ApplicationController` a partir del token. Las consultas de fincas siempre se encadenan desde `current_user.fincas` para garantizar el aislamiento por usuario —ningún usuario puede acceder a las fincas de otro, aunque conozca el ID.

Para la ingesta de lecturas desde sensores físicos, se recomienda implementar un token de API de larga duración separado del JWT de usuario, dado que los dispositivos IoT no siguen el flujo de autenticación interactiva. Este token puede implementarse como un modelo `ApiKey` asociado a la finca o al usuario dueño del dispositivo.

---

## 8. Notas de implementación Rails

**Claves camelCase en el JSON:** el frontend envía y espera recibir claves en camelCase (`tipoDocumento`, `fechaRegistro`, `fincaId`). Rails por defecto usa snake_case. Los serializers definidos en este documento mapean las claves manualmente, que es el enfoque más explícito y seguro para una API con contratos fijos. Si el proyecto crece y se agregan más recursos, evaluar adoptar `jsonapi-serializer` con un inflector camelCase global.

**Paginación con pagy:** `pagy` es la solución de paginación adoptada. Es significativamente más rápida que `kaminari` o `will_paginate` porque no instancia objetos ActiveRecord para el conteo y no monkey-parchea los modelos. Los campos que devuelve el frontend (`total`, `page`, `pageSize`, `totalPages`) se mapean directamente desde `pagy.count`, `pagy.page`, `pagy.items` y `pagy.pages`. El límite de `page_size` se clampea a 100 para prevenir consultas abusivas.

**Búsqueda full-text con pg_search:** `pg_search` es la solución de búsqueda adoptada. El scope `buscar` definido en el modelo `Finca` construye una consulta `tsvector` de PostgreSQL sobre las columnas `nombre` (peso A), `municipio` y `departamento` (peso B) y `dueno_nombre` (peso C). El uso de `prefix: true` permite que términos parciales como "para" encuentren "Paraíso". El diccionario `spanish` normaliza tildes y stopwords del español. Para que los índices GIN funcionen correctamente, ejecutar la siguiente migración adicional:

```ruby
# db/migrate/XXXXXXXX_add_search_index_to_fincas.rb
def change
  add_index :fincas,
    "to_tsvector('spanish', coalesce(nombre,'') || ' ' ||
                             coalesce(municipio,'') || ' ' ||
                             coalesce(departamento,'') || ' ' ||
                             coalesce(dueno_nombre,''))",
    using: :gin,
    name: 'index_fincas_on_search_vector'
end
```

**CORS:** habilitar el header para el origen del frontend en desarrollo (`http://localhost:5173`) y producción mediante la gema `rack-cors`.

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch('FRONTEND_URL', 'http://localhost:5173')
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :patch, :delete, :options]
  end
end
```

**Volumen de lecturas de sensores:** con 4 lecturas diarias por finca, una instalación con 100 fincas activas genera ~400 registros diarios — ~146 000 al año. El índice compuesto `[finca_id, fecha]` es suficiente para las consultas del módulo. Si se proyectan miles de fincas, evaluar particionamiento de la tabla por rango de fechas o un almacén de series temporales (TimescaleDB).
