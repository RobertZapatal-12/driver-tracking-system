
INSERT INTO users (nombre, email, contrasena, role)
VALUES 
('Carlos Ramirez', 'carlos@example.com', 'pass123', 'admin'),
('Ana Lopez', 'ana@example.com', 'clave456', 'operador'),
('Luis Martinez', 'luis@example.com', 'seguro789', 'cliente'),
('Maria Gomez', 'maria@example.com', 'clave321', 'cliente'),
('Pedro Santana', 'pedro@example.com', 'password987', 'operador');


INSERT INTO drivers (nombre, telefono, numero_licencia, estado)
VALUES
('Juan Perez', '8091234567', 'LIC12345', 'available'),
('Carlos Diaz', '8294567890', 'LIC67890', 'busy'),
('Maria Lopez', '8495551234', 'LIC11223', 'offline');


INSERT INTO vehicles (driver_id, plate_number, modelo, marca, color, year)
VALUES
(1, 'A123456', 'Corolla', 'Toyota', 'Blanco', 2020),
(2, 'B654321', 'Civic', 'Honda', 'Negro', 2019),
(3, 'C987654', 'Elantra', 'Hyundai', 'Gris', 2021);


INSERT INTO locations (driver_id, latitud, longitud, velocidad)
VALUES
(1, 18.4861, -69.9312, 45),
(1, 18.4870, -69.9305, 40),
(2, 18.4800, -69.9200, 30),
(2, 18.4825, -69.9212, 35),
(3, 18.4900, -69.9400, 0);


INSERT INTO driver_last_location (driver_id, latitud, longitud, velocidad)
VALUES
(1, 18.4861, -69.9312, 60.5),
(2, 18.4802, -69.9428, 45.2),
(3, 18.4705, -69.9003, 0.0)

ON CONFLICT (driver_id)
DO UPDATE SET
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    velocidad = EXCLUDED.velocidad,
    actualizado_en = CURRENT_TIMESTAMP;


SELECT * FROM drivers;

INSERT INTO routes (user_id, vehicle_id, origen, destino, estado)
VALUES
(3, 1, 'Zona Colonial', 'Aeropuerto Las Americas', 'pendiente'),
(4, 2, 'Santo Domingo Este', 'Agora Mall', 'aceptado'),
(3, 3, 'Los Alcarrizos', 'Downtown Center', 'completado'),
(5, 1, 'Villa Mella', 'Blue Mall', 'pendiente'),
(4, 2, 'San Isidro', 'Plaza Central', 'cancelado');

--Datos trip request
INSERT INTO routes (user_id, vehicle_id, origen, destino)
VALUES
(1, 2, 'Sede Central', 'Sucursal Norte'),
(2, 1, 'Villa Luisa', 'Zona Colonial'),
(3, 3, 'UASD', 'Agora Mall'),
(1, 2, 'Aeropuerto Las Américas', 'Santo Domingo Este'),
(4, 1, 'Mega Centro', 'Sambil');

--Datos trips
-- ¡Atención! La tabla 'request' ha sido modificada para recibir solicitudes web.
-- Las siguientes inserciones ya no son válidas con el nuevo esquema de la tabla:
-- INSERT INTO request (route_id, user_id, vehicle_id, inicio, fin, estado)
-- VALUES
-- (1, 1, 2, '2026-03-14 09:00:00', '2026-03-14 09:30:00', 'completado'),
-- (2, 2, 1, '2026-03-14 10:15:00', '2026-03-14 10:50:00', 'completado');