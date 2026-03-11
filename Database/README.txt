# Sistema de Tracking de Conductores

Este proyecto implementa el modelo de base de datos para un sistema de seguimiento de conductores y vehículos.
Permite registrar conductores, vehículos y ubicaciones GPS para monitoreo en tiempo real.

## Estructura del Proyecto

```
database/
│
├── schema.sql      # Creación de tablas y relaciones
├── indexes.sql     # Índices para optimizar consultas
├── views.sql       # Vistas para consultas frecuentes
├── queries.sql     # Consultas principales que usará el backend
├── seed.sql        # Datos de prueba
└── README.md       # Documentación del proyecto
```

## Modelo de Datos

La base de datos contiene las siguientes tablas principales:

* **users** → usuarios del sistema (administradores u operadores).
* **drivers** → información de los conductores.
* **vehicle** → vehículos asignados a conductores.
* **locations** → historial de ubicaciones GPS de los conductores.
* **driver_last_location** → última ubicación conocida de cada conductor.

## Cómo levantar la base de datos

### 1. Crear la base de datos

```sql
CREATE DATABASE tracking_conductores;
```

Conectarse a la base de datos:

```sql
\c tracking_conductores
```

### 2. Ejecutar los scripts

Los scripts deben ejecutarse en el siguiente orden:

1. `schema.sql` → crea las tablas y relaciones.
2. `indexes.sql` → crea los índices para mejorar el rendimiento.
3. `views.sql` → crea las vistas utilizadas para consultas del sistema.
4. `queries.sql` → contiene las consultas principales que usará el backend.
5. `seed.sql` → inserta datos de prueba.

Ejemplo desde la terminal usando **psql**:

```
psql -U postgres -d tracking_conductores -f schema.sql
psql -U postgres -d tracking_conductores -f indexes.sql
psql -U postgres -d tracking_conductores -f views.sql
psql -U postgres -d tracking_conductores -f queries.sql
psql -U postgres -d tracking_conductores -f seed.sql
```

## Verificación

Para comprobar que todo se creó correctamente puedes ejecutar:

```sql
SELECT * FROM drivers;
SELECT * FROM vehicle;
SELECT * FROM locations;
SELECT * FROM drivers_current_location;
```

Si las tablas o vistas muestran datos, la base de datos fue creada correctamente.

## Uso

Esta base de datos está diseñada para conectarse a un backend (por ejemplo con **FastAPI** o cualquier API REST) que permita:

* registrar conductores
* asignar vehículos
* registrar ubicaciones GPS
* consultar ubicaciones en tiempo real
* obtener historial de ubicaciones de los conductores
