-- Obtener todos los conductores
SELECT *
FROM users;


-- Obtener un conductor específico por ID
SELECT *
FROM drivers
WHERE driver_id = $1;


-- Crear un nuevo conductor
INSERT INTO drivers (nombre, telefono, numero_licencia, estado)
VALUES ($1, $2, $3, $4);


-- Asignar un vehículo a un conductor
INSERT INTO vehicles (driver_id, plate_number, marca, modelo, color, year)
VALUES ($1, $2, $3, $4, $5, $6);


-- Registrar una nueva ubicación GPS
INSERT INTO locations (driver_id, latitud, longitud, velocidad)
VALUES ($1, $2, $3, $4);


-- Actualizar la última ubicación del conductor
INSERT INTO driver_last_location (driver_id, latitud, longitud, velocidad)
VALUES ($1, $2, $3, $4)
ON CONFLICT (driver_id)
DO UPDATE SET
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    velocidad = EXCLUDED.velocidad,
    actualizado_en = CURRENT_TIMESTAMP;


-- Obtener ubicación actual de todos los conductores
SELECT *
FROM drivers_current_location;


-- Obtener historial de ubicaciones de un conductor
SELECT *
FROM locations
WHERE driver_id = $1
ORDER BY registrado_en DESC;


-- Crear un nuevo usuario
INSERT INTO users (nombre, email, contrasena, role)
VALUES ($1, $2, $3, $4);


-- Obtener todos los usuarios
SELECT * FROM users;


-- Obtener un usuario específico
SELECT *
FROM users
WHERE user_id = 1;

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'trip_request';
-- =====================================
-- Este archivo contiene las consultas principales utilizadas
-- por la API para interactuar con la base de datos del sistema
-- de tracking de conductores.
--
-- Cambios realizados:
--
-- 1. Actualización de nombres de tablas:
--    Se cambió el uso de:
--        vehicle → vehicles
--    para coincidir con el esquema actualizado.
--
-- 2. Corrección de nombres de columnas:
--    Se reemplazó:
--        conductor_id → driver_id
--    para mantener consistencia con la tabla drivers.
--
-- 3. Corrección del campo estado en drivers:
--    Se eliminó el valor booleano (true) y se cambió por
--    un parámetro ($4) para permitir estados como:
--        'available', 'busy', 'offline'.
--
-- 4. Compatibilidad con el esquema actual:
--    Todas las consultas fueron ajustadas para funcionar
--    correctamente con las tablas y relaciones definidas
--    en schema.sql.
--
-- Estas consultas son utilizadas por el backend para
-- operaciones como registro de conductores, asignación
-- de vehículos, registro de ubicaciones GPS y gestión
-- de usuarios.
-- =====================================

ALTER TABLE locations
DROP CONSTRAINT locations_driver_id_fkey;

ALTER TABLE locations
ADD CONSTRAINT locations_driver_id_fkey
FOREIGN KEY (driver_id)
REFERENCES drivers(driver_id)
ON DELETE CASCADE;


ALTER TABLE driver_last_location
DROP CONSTRAINT driver_last_location_driver_id_fkey;

ALTER TABLE driver_last_location
ADD CONSTRAINT driver_last_location_driver_id_fkey
FOREIGN KEY (driver_id)
REFERENCES drivers(driver_id)
ON DELETE CASCADE;


ALTER TABLE vehicles
DROP CONSTRAINT vehicles_driver_id_fkey;
ALTER TABLE vehicles
ADD CONSTRAINT vehicles_driver_id_fkey
FOREIGN KEY (driver_id)
REFERENCES drivers(driver_id)
ON DELETE CASCADE;

SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'f';

SELECT conname
FROM pg_constraint
WHERE conrelid = 'driver_last_location'::regclass