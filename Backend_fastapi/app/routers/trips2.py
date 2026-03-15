from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con los viajes
router = APIRouter(
    prefix="/request", # Todas las rutas comenzarán con /trips
    tags=["Request"]   # Nombre que aparecerá en la documentación automática de FastAPI
)
#conseguir todas las rutas
@router.get("/", response_model=list[schemas.TripResponse])
def get_all_trips(db: Session = Depends(get_db)):

    trips = db.query(models.Trip).all()

    return trips

#Crear ruta
@router.post("/", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    new_trip = models.Trip(**trip.dict())

    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    return new_trip

#Conseguir rutas por id
@router.get("/{trip_id}", response_model=schemas.TripResponse)
def get_trip_by_id(trip_id: int, db: Session = Depends(get_db)):

    trip = db.query(models.Trip).filter(models.Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip no encontrado")

    return trip

#Actualizar trip
@router.put("/{trip_id}", response_model=schemas.TripResponse)
def update_trip(trip_id: int, trip: schemas.TripCreate, db: Session = Depends(get_db)):

    trip_db = db.query(models.Trip).filter(models.Trip.trip_id == trip_id).first()

    if not trip_db:
        raise HTTPException(status_code=404, detail="Trip no encontrado")

    trip_db.request_id = trip.request_id
    trip_db.inicio = trip.inicio
    trip_db.fin = trip.fin
    trip_db.estado = trip.estado

    db.commit()
    db.refresh(trip_db)

    return trip_db


#eliminar trip
@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):

    trip = db.query(models.Trip).filter(models.Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip no encontrado")

    db.delete(trip)
    db.commit()

    return {"message": "Trip eliminado correctamente"}