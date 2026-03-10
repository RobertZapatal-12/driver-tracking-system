--CREACION DE IDEX PARA LA TABLA LOCATION--
-- Mejoran el rendimiento de las consultas

-- buscar ubicaciones por conductor
CREATE INDEX idx_driver_locations
ON locations(driver_id);

-- ordenar ubicaciones por tiempo
CREATE INDEX idx_locations_time
ON locations(registrado_en);

-- Mejora consultas que buscan ubicaciones de un conductor
-- ordenadas por tiempo (por ejemplo obtener la última ubicación registrada)
CREATE INDEX idx_locations_driver_time
ON locations(driver_id, registrado_en DESC);

-- Mejora consultas que buscan los vehículos asociados
-- a un conductor específico
CREATE INDEX idx_vehicle_driver
ON vehicle(conductor_id);
