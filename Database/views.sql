-- Ver cada conductor junto con su última ubicación registrada
CREATE VIEW drivers_current_location AS
SELECT 
    d.driver_id,
    d.nombre,
    d.telefono,
    d.estado,
    l.latitud,
    l.longitud,
    l.velocidad,
    l.actualizado_en
FROM drivers d
JOIN driver_last_location l
ON d.driver_id = l.driver_id;

SELECT * FROM drivers_current_location;

-- Conductores con su estado y vehículo
CREATE VIEW view_driver_vehicle_status AS
SELECT
    d.driver_id,
    d.nombre,
    d.telefono,
    d.estado,
    v.plate_number,
    v.marca,
    v.modelo,
    v.year
FROM drivers d
LEFT JOIN vehicles v
ON d.driver_id = v.driver_id;

SELECT * FROM view_driver_vehicle_status;

-- Usuarios del sistema con información básica
CREATE VIEW view_users_info AS
SELECT
    user_id,
    nombre,
    email,
    role,
    creado_desde
FROM users;

SELECT * FROM view_users_info;

-- VIEW: view_trip_details
-- Descripción:
-- Esta vista muestra información completa de cada solicitud de viaje
-- combinando datos del usuario, conductor y vehículo.
-- Se utiliza para paneles administrativos o dashboards donde se
-- necesita ver todos los detalles del viaje en una sola consulta.
CREATE VIEW view_trip_details AS
SELECT
    t.request_id,
    u.nombre AS usuario,
    d.nombre AS conductor,
    v.plate_number,
    t.origen,
    t.destino,
    t.fecha,
    t.estado
FROM trip_request t
LEFT JOIN users u ON t.user_id = u.user_id
LEFT JOIN drivers d ON t.driver_id = d.driver_id
LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id;

SELECT * FROM view_trip_details;

-- =====================================
-- Este archivo define las vistas utilizadas por el sistema
-- para simplificar consultas frecuentes y mejorar la lectura
-- de los datos desde el backend o dashboards.
--
-- Cambios realizados:
--
-- 1. Actualización de nombres de tablas:
--    Se reemplazó el uso de:
--        vehicle → vehicles
--    para coincidir con el esquema actualizado de la base de datos.
--
-- 2. Corrección de relaciones entre tablas:
--    Se reemplazó:
--        conductor_id → driver_id
--    para mantener consistencia con la tabla drivers.
--
-- 3. Ajuste de joins en las vistas:
--    Las relaciones entre conductores, vehículos y usuarios
--    fueron actualizadas para reflejar correctamente
--    la estructura actual del esquema.
--
-- Estas vistas permiten obtener información consolidada
-- como conductores con su ubicación actual, vehículos
-- asociados y datos de usuarios sin escribir consultas
-- complejas repetidamente.
-- =====================================