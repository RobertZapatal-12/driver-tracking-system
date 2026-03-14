from pydantic import BaseModel


# =========================
# USERS
# =========================

class UserBase(BaseModel):
    nombre: str
    email: str
    contrasena: str
    role: str


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    user_id: int

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
    color: str
    year: int


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
# TRIPS
# =========================

class TripBase(BaseModel):
    user_id: int
    driver_id: int
    vehicle_id: int
    origen: str
    destino: str
    estado: str


class TripCreate(TripBase):
    pass


class TripResponse(TripBase):
    trip_id: int

    class Config:
        from_attributes = True