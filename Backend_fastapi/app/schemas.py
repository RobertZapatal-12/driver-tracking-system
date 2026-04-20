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


class LoginUserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    driver_id: int | None = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    user: LoginUserResponse

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
    driver_id: Optional[int] = None
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
    lat_origen: Optional[float] = None
    lon_origen: Optional[float] = None
    lat_destino: Optional[float] = None
    lon_destino: Optional[float] = None


class RouteCreate(RouteBase):
    pass


class RouteStatusUpdate(BaseModel):
    estado: str   # Pendiente | Aceptado | En camino | Completado


class RouteResponse(RouteBase):
    route_id: int
    user_id: int | None = None
    vehicle_id: int
    driver_id: int | None = None
    fecha: datetime
    estado: str | None = None
    driver_nombre: str | None = None

    class Config:
        from_attributes = True


# =========================
# REQUEST
# =========================

class RequestBase(BaseModel):
    cliente: str
    fecha: str
    origen: str
    destino: str
    descripcion: str
    tipo_vehiculo: str
    estado: str = "pendiente"
    prioridad: str
    user_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    notas_operador: Optional[str] = None


class RequestCreate(BaseModel):
    cliente: str
    fecha: str
    origen: str
    destino: str
    descripcion: str
    tipo_vehiculo: str
    prioridad: str


class RequestResponse(RequestBase):
    request_id: int
    operador_nombre: Optional[str] = None
    driver_nombre: Optional[str] = None
    vehicle_info: Optional[str] = None

    class Config:
        from_attributes = True


class RequestTomar(BaseModel):
    user_id: int


class RequestCompletar(BaseModel):
    user_id: int


class RequestOperadorUpdate(BaseModel):
    user_id: int
    origen: Optional[str] = None
    destino: Optional[str] = None
    descripcion: Optional[str] = None
    prioridad: Optional[str] = None
    tipo_vehiculo: Optional[str] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    notas_operador: Optional[str] = None


# =========================
# DRIVER TRIPS (App Móvil)
# =========================

class DriverTripCreate(BaseModel):
    driver_id: int
    lat_inicio: float
    lon_inicio: float


class DriverTripEnd(BaseModel):
    lat_fin: float
    lon_fin: float


class DriverTripResponse(BaseModel):
    trip_id: int
    driver_id: int
    estado: str
    inicio: datetime
    fin: Optional[datetime] = None
    lat_inicio: Optional[float] = None
    lon_inicio: Optional[float] = None
    lat_fin: Optional[float] = None
    lon_fin: Optional[float] = None

    class Config:
        from_attributes = True
