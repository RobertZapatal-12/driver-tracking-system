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

-- TABLA: clients
CREATE TABLE clients (
    client_id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefono VARCHAR(10),
    cedula VARCHAR(11),
    direccion TEXT,
    estado TEXT,
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
    driver_id INTEGER,

    plate_number VARCHAR(7),
    modelo TEXT,
    marca TEXT,
    color TEXT,
    year INTEGER,

    CONSTRAINT vehicles_driver_id_fkey
    FOREIGN KEY (driver_id)
    REFERENCES drivers(driver_id)
    ON DELETE CASCADE
);

-- TABLA: locations
-- Historial completo de ubicaciones
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    driver_id INTEGER,

    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    velocidad DOUBLE PRECISION,
    registrado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT locations_driver_id_fkey
    FOREIGN KEY (driver_id)
    REFERENCES drivers(driver_id)
    ON DELETE CASCADE
);

-- TABLA: driver_last_location
-- Última ubicación de cada conductor
CREATE TABLE driver_last_location (
    driver_id INTEGER PRIMARY KEY,

    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    velocidad DOUBLE PRECISION,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT driver_last_location_driver_id_fkey
    FOREIGN KEY (driver_id)
    REFERENCES drivers(driver_id)
    ON DELETE CASCADE
);


-- TABLA: trip_request
-- Solicitud de viajes (citas)
CREATE TABLE routes (
    route_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    vehicle_id INTEGER,

    origen TEXT NOT NULL,
    destino TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado TEXT,

    CONSTRAINT trip_request_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

    CONSTRAINT trip_request_vehicle_id_fkey
    FOREIGN KEY (vehicle_id)
    REFERENCES vehicles(vehicle_id)
    ON DELETE CASCADE
);

CREATE TABLE request (
    request_id SERIAL PRIMARY KEY,

    route_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,

    inicio TIMESTAMP,
    fin TIMESTAMP,
    estado TEXT,

    CONSTRAINT request_route_id_fkey
    FOREIGN KEY (route_id)
    REFERENCES routes(route_id)
    ON DELETE CASCADE,

    CONSTRAINT request_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

    CONSTRAINT request_vehicle_id_fkey
    FOREIGN KEY (vehicle_id)
    REFERENCES vehicles(vehicle_id)
    ON DELETE CASCADE
);
