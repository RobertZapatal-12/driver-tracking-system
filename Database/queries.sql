
-- QUERIES PRINCIPALES DEL SISTEMA
-- Sistema de Tracking de Conductores



-- Obtener todos los conductores
SELECT *
FROM drivers;


-- Obtener un conductor específico por ID
SELECT *
FROM drivers
WHERE driver_id = $1;


-- Crear un nuevo conductor
INSERT INTO drivers (nombre, telefono, numero_licencia, estado)
VALUES ($1, $2, $3, true);


-- Asignar un vehículo a un conductor
INSERT INTO vehicle (conductor_id, plate_number, marca, modelo, color, year)
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

--Obtener un ususario en especifico
SELECT *
FROM users
WHERE user_id = $1;