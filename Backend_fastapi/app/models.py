from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.sql import func
# =========================
# USERS
# =========================

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    email = Column(String, unique=True)
    contrasena = Column(String)
    role = Column(String)
    idoperador = Column(String)
    usertelefono = Column(String)

# =========================
# CLIENTS
# =========================

class Client(Base):
    __tablename__ = "clients"

    client_id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    email = Column(String, unique=True)
    telefono = Column(String)
    cedula = Column(String)
    direccion = Column(String)
    estado = Column(String)


# =========================
# DRIVERS
# =========================

# =========================
# DRIVERS
# =========================

class Driver(Base):
    __tablename__ = "drivers"

    driver_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=True)

    nombre = Column(String)
    telefono = Column(String)
    numero_licencia = Column(String)
    tipo_licencia = Column(String)
    cedula = Column(String)
    estado = Column(String)
    imagen = Column(String)
    descripcion = Column(String)

    user = relationship("User")    
    


# =========================
# LOCATIONS
# =========================

class Location(Base):
    __tablename__ = "locations"

    location_id = Column(Integer, primary_key=True, index=True)

    driver_id = Column(Integer, ForeignKey("drivers.driver_id"))

    latitud = Column(Float)
    longitud = Column(Float)
    velocidad = Column(Float)


# =========================
# route
# =========================

class Route(Base):
    __tablename__ = "routes"

    route_id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    vehicle_id = Column(Integer, ForeignKey("vehicles.vehicle_id", ondelete="CASCADE"))
    driver_id = Column(Integer, ForeignKey("drivers.driver_id"))

    origen = Column(String)
    destino = Column(String)

    lat_origen = Column(Float, nullable=True)
    lon_origen = Column(Float, nullable=True)
    lat_destino = Column(Float, nullable=True)
    lon_destino = Column(Float, nullable=True)

    fecha = Column(DateTime, server_default=func.now())
    estado = Column(String, default="Pendiente")
    driver = relationship("Driver")

# =========================
# VEHICLES
# =========================

class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.driver_id"))

    plate_number = Column(String(7))
    modelo = Column(String(50))
    marca = Column(String(50))
    tipo_vehiculo = Column(String(50))
    capacidad = Column(String(20))
    estado = Column(String(20), default="Disponible")

    imagen1 = Column(String(255))
    imagen2 = Column(String(255))
    imagen3 = Column(String(255))
    imagen4 = Column(String(255))
    imagen5 = Column(String(255))
# =========================
# request
# =========================

class Request(Base):
    __tablename__ = "request"

    request_id = Column(Integer, primary_key=True, index=True)

    cliente = Column(String)
    fecha = Column(String)
    origen = Column(String)
    destino = Column(String)
    descripcion = Column(String)
    tipo_vehiculo = Column(String)
    estado = Column(String, default="pendiente")
    prioridad = Column(String)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    vehicle_id = Column(Integer, nullable=True)
    driver_id = Column(Integer, nullable=True)
    notas_operador = Column(String, nullable=True)

    operador = relationship("User", foreign_keys=[user_id])

# =========================
# DRIVER TRIPS (App Móvil)
# =========================

class DriverTrip(Base):
    __tablename__ = "driver_trips"

    trip_id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.driver_id"))

    estado = Column(String, default="En curso")       # "En curso" | "Completado"
    inicio = Column(DateTime, server_default=func.now())
    fin = Column(DateTime, nullable=True)

    lat_inicio = Column(Float, nullable=True)
    lon_inicio = Column(Float, nullable=True)
    lat_fin = Column(Float, nullable=True)
    lon_fin = Column(Float, nullable=True)

    driver = relationship("Driver")
