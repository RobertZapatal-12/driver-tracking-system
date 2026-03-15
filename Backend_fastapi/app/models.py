from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


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


# =========================
# DRIVERS
# =========================

class Driver(Base):
    __tablename__ = "drivers"

    driver_id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    telefono = Column(String)
    numero_licencia = Column(String)
    tipo_licencia = Column(String)
    cedula = Column(String)
    estado = Column(String)
    
    


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
# TRIPS
# =========================

class TripRequest(Base):
    __tablename__ = "trip_request"

    request_id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.user_id"))
    vehicle_id = Column(Integer, ForeignKey("vehicles.vehicle_id"))

    origen = Column(String)
    destino = Column(String)

    estado = Column(String, default="Pendiente", nullable=False)

# =========================
# VEHICLES
# =========================

class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(Integer, primary_key=True, index=True)

    driver_id = Column(Integer, ForeignKey("drivers.driver_id"))

    plate_number = Column(String)
    modelo = Column(String)
    marca = Column(String)
    color = Column(String)
    year = Column(Integer)