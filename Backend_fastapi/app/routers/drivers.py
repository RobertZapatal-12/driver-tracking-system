from fastapi import APIRouter, Depends, HTTPException
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
    
    new_driver = models.Driver(**driver.dict())

    
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)
    
   
    return new_driver

# Endpoint para marcar conductor como Activo o Inactivo (usado por la app móvil)
@router.patch("/{driver_id}/estado")
def update_driver_estado(driver_id: int, body: dict, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    nuevo_estado = body.get("estado")
    if not nuevo_estado:
        raise HTTPException(status_code=400, detail="Campo 'estado' requerido")
    driver.estado = nuevo_estado
    db.commit()
    db.refresh(driver)
    return {"driver_id": driver_id, "estado": driver.estado}

#Endpoint para actualizar un conductor
@router.put("/{driver_id}")
def update_driver(driver_id: int, driver: schemas.DriverCreate, db: Session = Depends(get_db)):

    db_driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()

    if not db_driver:
        return {"error": "Conductor no encontrado"}

    for key, value in driver.dict().items():
        setattr(db_driver, key, value)

    db.commit()
    db.refresh(db_driver)

    return db_driver

#Endpoint para borrar un conductor
@router.delete("/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db)):

    # Buscar el conductor
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()

    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    # Borrar datos relacionados primero
    db.query(models.Location).filter(models.Location.driver_id == driver_id).delete()
    db.query(models.Vehicle).filter(models.Vehicle.driver_id == driver_id).delete()

    # Luego borrar el conductor
    db.delete(driver)
    db.commit()

    return {"mensaje": "Conductor eliminado"}