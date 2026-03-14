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
    telefono VARCHAR(10),
    numero_licencia VARCHAR(11),
    tipo_licencia TEXT,
    cedula VARCHAR(11),
    estado TEXT,
    creado_desde TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: vehicles
CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(driver_id),
    plate_number VARCHAR(7),
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
    vehicle_id INTEGER REFERENCES vehicles(vehicle_id),
    origen TEXT NOT NULL,
    destino TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado TEXT DEFAULT 'Pendiente'
);

CREATE TABLE trips (
    trip_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES trip_request(request_id),
    inicio TIMESTAMP,
    fin TIMESTAMP,
    estado TEXT
);
