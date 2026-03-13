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

    # Convierte los datos recibidos en el schema en un objeto del modelo Location
    new_location = models.Location(**location.dict())
    
    # Agrega la nueva ubicación a la sesión de la base de datos
    db.add(new_location)
    # Guarda los cambios en la base de datos
    db.commit()
    # Actualiza el objeto con los datos generados por la base de datos (ej: id)
    db.refresh(new_location)
    # Devuelve la ubicación recién creada
    return new_location

# Endpoint para obtener todas las ubicaciones asociadas a un conductor específico
@router.get("/driver/{driver_id}")
def get_driver_locations(driver_id: int, db: Session = Depends(get_db)):

    # Consulta la tabla locations filtrando por el id del conductor
    # all() devuelve todas las ubicaciones registradas para ese driver   
    return db.query(models.Location)\
        .filter(models.Location.driver_id == driver_id)\
        .all()