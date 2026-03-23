from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/locations",
    tags=["Locations"]
)

@router.post("/")
def create_location(location: schemas.LocationCreate, db: Session = Depends(get_db)):
    new_location = models.Location(**location.dict())
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location

@router.get("/driver/{driver_id}")
def get_driver_locations(driver_id: int, db: Session = Depends(get_db)):
    return db.query(models.Location)\
        .filter(models.Location.driver_id == driver_id)\
        .all()

@router.get("/latest")
def get_latest_locations(db: Session = Depends(get_db)):
    subquery = (
        db.query(
            models.Location.driver_id,
            func.max(models.Location.location_id).label("max_location_id")
        )
        .group_by(models.Location.driver_id)
        .subquery()
    )

    results = (
        db.query(models.Location, models.Driver)
        .join(subquery, models.Location.location_id == subquery.c.max_location_id)
        .join(models.Driver, models.Driver.driver_id == models.Location.driver_id)
        .all()
    )

    data = []
    for location, driver in results:
        data.append({
            "driver_id": driver.driver_id,
            "nombre": driver.nombre,
            "latitud": location.latitud,
            "longitud": location.longitud,
            "velocidad": location.velocidad,
            "registrado_en": getattr(location, "registrado_en", None),
        })

    return data

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