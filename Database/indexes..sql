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
ON vehicles(driver_id);

-- =====================================
-- Este archivo define los índices utilizados en la base de datos
-- para mejorar el rendimiento de las consultas más frecuentes
-- del sistema de tracking de conductores.
--
-- Cambios realizados:
--
-- 1. Actualización de nombres de tabla y columnas:
--    Se corrigió el índice que hacía referencia a:
--        vehicle(conductor_id)
--    y se actualizó a:
--        vehicles(driver_id)
--    para coincidir con el esquema actualizado.
--
-- 2. Optimización de consultas de ubicación:
--    Se agregaron índices en la tabla locations para mejorar:
--        - búsquedas por conductor
--        - ordenamiento por tiempo
--        - consultas combinadas por conductor y tiempo
--
-- Estos índices ayudan a mejorar el rendimiento en operaciones
-- críticas del sistema como:
--        - obtener la última ubicación de un conductor
--        - consultar historial de ubicaciones
--        - buscar vehículos asociados a conductores
-- =====================================