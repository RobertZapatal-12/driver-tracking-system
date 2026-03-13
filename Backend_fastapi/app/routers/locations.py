from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con ubicaciones
router = APIRouter(
    prefix="/locations", # Todas las rutas comenzarán con /locations
    tags=["Locations"]   # Nombre que aparecerá en la documentación automática de FastAP
)

# Endpoint para crear una nueva ubicación en la base de datos
@router.post("/")
def create_location(location: schemas.LocationCreate, db: Session = Depends(get_db)):

    
    new_location = models.Location(**location.dict())
    
    
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    
    return new_location

# Endpoint para obtener todas las ubicaciones asociadas a un conductor específico
@router.get("/driver/{driver_id}")
def get_driver_locations(driver_id: int, db: Session = Depends(get_db)):

    
    return db.query(models.Location)\
        .filter(models.Location.driver_id == driver_id)\
        .all()

@router.put("/{location_id}")
def update_location(location_id: int, location: schemas.LocationCreate, db: Session = Depends(get_db)):

    db_location = db.query(models.Location).filter(models.Location.location_id == location_id).first()

    if not db_location:
        return {"error": "Ubicación no encontrada"}

    for key, value in location.dict().items():
        setattr(db_location, key, value)

    db.commit()
    db.refresh(db_location)

    return db_location

@router.delete("/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)):

    location = db.query(models.Location).filter(models.Location.location_id == location_id).first()

    if not location:
        return {"error": "Ubicación no encontrada"}

    db.delete(location)
    db.commit()

    return {"mensaje": "Ubicación eliminada correctamente"}