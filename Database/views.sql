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

