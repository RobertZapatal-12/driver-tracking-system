from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/vehicles", # Todas las rutas comenzarán con /users
    tags=["Vehicles"]   # Nombre que aparecerá en la documentación automática de FastAPI
)

# Obtener todos los vehículos
@router.get("/")
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(models.Vehicle).all()


# Obtener vehículo por ID
@router.get("/{vehicle_id}")
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):

    vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()

    if not vehicle:
        return {"error": "Vehículo no encontrado"}

    return vehicle


# Crear vehículo
@router.post("/")
def create_vehicle(vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):

    new_vehicle = models.Vehicle(**vehicle.dict())

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    return new_vehicle


# Actualizar vehículo
@router.put("/{vehicle_id}")
def update_vehicle(vehicle_id: int, vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):

    db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()

    if not db_vehicle:
        return {"error": "Vehículo no encontrado"}

    for key, value in vehicle.dict().items():
        setattr(db_vehicle, key, value)

    db.commit()
    db.refresh(db_vehicle)

    return db_vehicle


# Eliminar vehículo
@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):

    vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()

    if not vehicle:
        return {"error": "Vehículo no encontrado"}

    db.delete(vehicle)
    db.commit()

    return {"mensaje": "Vehículo eliminado correctamente"}