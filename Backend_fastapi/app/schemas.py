from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# =========================
# USERS
# =========================

class UserBase(BaseModel):
    nombre: str
    email: str
    contrasena: str
    role: str
    usertelefono: str 
    idoperador: str


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    user_id: int

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: dict

    class Config:
        from_attributes = True


# =========================
# CLIENTS
# =========================

class ClientBase(BaseModel):
    nombre: str
    email: str
    telefono: str
    cedula: str
    direccion: str
    estado: str


class ClientCreate(ClientBase):
    pass


class ClientResponse(ClientBase):
    client_id: int

    class Config:
        from_attributes = True


# =========================
# DRIVERS
# =========================

class DriverBase(BaseModel):
    nombre: str
    telefono: str
    numero_licencia: str
    cedula: str
    tipo_licencia: str
    estado: str
    imagen: Optional[str] = None
    descripcion: Optional[str] = None


class DriverCreate(DriverBase):
    pass


class DriverResponse(DriverBase):
    driver_id: int

    class Config:
        from_attributes = True


# =========================
# VEHICLES
# =========================

class VehicleBase(BaseModel):
    driver_id: int
    plate_number: str
    modelo: str
    marca: str
    tipo_vehiculo: str
    capacidad: str
    estado: str = "Disponible"
    imagen1: Optional[str] = None
    imagen2: Optional[str] = None
    imagen3: Optional[str] = None
    imagen4: Optional[str] = None
    imagen5: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleResponse(VehicleBase):
    vehicle_id: int

    class Config:
        from_attributes = True


# =========================
# LOCATIONS
# =========================

class LocationBase(BaseModel):
    driver_id: int
    latitud: float
    longitud: float
    velocidad: float


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    location_id: int

    class Config:
        from_attributes = True


# =========================
# route
# =========================

class RouteBase(BaseModel):
    user_id: int
    vehicle_id: int
    origen: str
    destino: str
    


class RouteCreate(RouteBase):
    pass


class RouteResponse(RouteBase):
    route_id: int
    user_id: int | None = None
    vehicle_id: int
    driver_id: int | None = None
    origen: str
    destino: str
    fecha: datetime
    estado: str | None = None
    driver_nombre: str | None = None

    class Config:
        from_attributes = True



from pydantic import BaseModel
from datetime import datetime


# =========================
# REQUEST
# =========================

class RequestBase(BaseModel):
    route_id: int
    user_id: int
    vehicle_id: int
    inicio: datetime
    fin: datetime
    estado: str


class RequestCreate(RequestBase):
    pass


class RequestResponse(RequestBase):
    request_id: int

    class Config:
        from_attributes = True