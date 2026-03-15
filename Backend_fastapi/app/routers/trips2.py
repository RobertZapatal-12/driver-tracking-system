from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con los request
router = APIRouter(
    prefix="/request", 
    tags=["Request"]   
)
#conseguir todas los requesr
@router.get("/", response_model=list[schemas.TripResponse])
def get_all_trips(db: Session = Depends(get_db)):

    trips = db.query(models.Trip).all()

    return trips

#Crear request
@router.post("/", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    new_trip = models.Trip(**trip.dict())

    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    return new_trip

#Conseguir request
@router.get("/{trip_id}", response_model=schemas.TripResponse)
def get_trip_by_id(trip_id: int, db: Session = Depends(get_db)):

    trip = db.query(models.Trip).filter(models.Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip no encontrado")

    return trip

#Actualizar request
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


#eliminar request
@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):

    trip = db.query(models.Trip).filter(models.Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip no encontrado")

    db.delete(trip)
    db.commit()

    return {"message": "Trip eliminado correctamente"}