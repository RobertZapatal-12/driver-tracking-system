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

