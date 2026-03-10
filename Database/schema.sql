-- =====================================
-- DATABASE SCHEMA
-- Sistema de Tracking de Conductores
-- =====================================

--CREACION DE TABLAS--

-- TABLA: drivers
-- Guarda la información de los conductores
create table users (
   user_id SERIAL PRIMARY KEY,
   nombre TEXT NOT NULL,
   email TEXT UNIQUE NOT NULL,
   contrasena TEXT NOT NULL,
   role text,
   creado_desde TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: drivers
-- Guarda la información de los conductores
CREATE TABLE drivers (
    driver_id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    numero_licencia TEXT,
    estado TEXT,
    creado_desde TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: vehicle
-- Cada vehículo pertenece a un conductor
CREATE TABLE vehicle (
    vehicles_id SERIAL PRIMARY KEY,
    conductor_id INTEGER REFERENCES drivers(driver_id),
    plate_number TEXT NOT NULL,
    modelo TEXT,
    marca TEXT,
    color TEXT,
    year INTEGER
);
-- Tabla locations
-- Guarda el historial completo de ubicaciones de los conductores
-- Esta tabla puede crecer muy rápido
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(driver_id),
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    velocidad DOUBLE PRECISION,
    registrado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: driver_last_location
-- Guarda la ultima ubicación conocida de cada conductor
-- Se usa para consultas rápidas en el mapa
CREATE TABLE driver_last_location (
    driver_id INTEGER PRIMARY KEY REFERENCES drivers(driver_id),
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    velocidad DOUBLE PRECISION,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

