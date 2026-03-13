from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para agrupar todas las rutas relacionadas con drivers
router = APIRouter(
    prefix="/drivers", # Todas las rutas comenzarán con /drivers
    tags=["Drivers"] # Nombre que aparecerá en la documentación automática
)

# Endpoint para obtener todos los conductores de la base de datos
@router.get("/")
def get_drivers(db: Session = Depends(get_db)):
    # Consulta todos los registros de la tabla drivers
    return db.query(models.Driver).all()

# Endpoint para obtener un conductor específico usando su ID
@router.get("/{driver_id}")
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    # Filtra la tabla drivers buscando el conductor con el ID indicado
    # first() devuelve el primer resultado encontrado
    return db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()

# Endpoint para crear un nuevo conductor en la base de datos
@router.post("/")
def create_driver(driver: schemas.DriverCreate, db: Session = Depends(get_db)):
    # Convierte los datos recibidos del schema en un objeto del modelo Driver
    new_driver = models.Driver(**driver.dict())

    # Agrega el nuevo conductor a la sesión de la base de datos
    db.add(new_driver)

    # Guarda los cambios en la base de datos
    db.commit()

    # Actualiza el objeto con los datos guardados (ejemplo: ID generado)
    db.refresh(new_driver)
    
    # Devuelve el conductor recién creado
    return new_driver