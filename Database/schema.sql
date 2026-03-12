-- =====================================
-- DATABASE SCHEMA
-- Sistema de Tracking de Conductores
-- =====================================

-- TABLA: users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    contrasena TEXT NOT NULL,
    role TEXT,
    creado_desde TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: drivers
CREATE TABLE drivers (
    driver_id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    numero_licencia TEXT,
    estado TEXT,
    creado_desde TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: vehicles
CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(driver_id),
    plate_number TEXT NOT NULL,
    modelo TEXT,
    marca TEXT,
    color TEXT,
    year INTEGER
);

-- TABLA: locations
-- Historial completo de ubicaciones
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(driver_id),
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    velocidad DOUBLE PRECISION,
    registrado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: driver_last_location
-- Última ubicación de cada conductor
CREATE TABLE driver_last_location (
    driver_id INTEGER PRIMARY KEY REFERENCES drivers(driver_id),
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    velocidad DOUBLE PRECISION,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: trip_request
-- Solicitud de viajes (citas)
CREATE TABLE trip_request (
    request_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    driver_id INTEGER REFERENCES drivers(driver_id),
    vehicle_id INTEGER REFERENCES vehicles(vehicle_id),
    origen TEXT NOT NULL,
    destino TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado TEXT
);

-- =====================================
-- Este archivo define la estructura principal de la base de datos
-- para el sistema de tracking de conductores.
--
-- Cambios realizados:
--
-- 1. Corrección en driver_last_location:
--    El campo driver_id se cambió de SERIAL a INTEGER PRIMARY KEY
--    para que coincida con el driver_id de la tabla drivers.
--    Esto asegura que cada conductor tenga una única última ubicación.
--
-- 2. Estandarización de nombres:
--    Se unificaron nombres de tablas y columnas para mantener
--    consistencia en todo el sistema:
--        vehicle → vehicles
--        conductor_id → driver_id
--        vehicles_id → vehicle_id
--
-- 3. Compatibilidad con queries del backend:
--    Se ajustaron las relaciones y nombres de columnas para que
--    coincidan con las consultas utilizadas en la API.
--
-- Estos cambios mejoran la integridad de datos, evitan duplicados
-- en ubicaciones actuales y mantienen consistencia en el esquema.
-- =====================================