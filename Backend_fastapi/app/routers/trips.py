from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con los viajes
router = APIRouter(
    prefix="/trips_request", # Todas las rutas comenzarán con /trips
    tags=["Trips Request"]   # Nombre que aparecerá en la documentación automática de FastAPI
)

#Obtener todos las solicitudes de viaje
@router.get("/", response_model=list[schemas.TripResponse])
def get_trip_requests(db: Session = Depends(get_db)):
    requests = db.query(models.TripRequest).all()
    return requests

# Endpoint para crear una nueva solicitud de viaje
@router.post("/", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):

    new_trip = models.TripRequest(**trip.dict(), estado="Pendiente")

    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    return new_trip

#Obtener viajes por id
@router.get("/{request_id}", response_model=schemas.TripResponse)
def get_trip_request(request_id: int, db: Session = Depends(get_db)):

    trip = db.query(models.TripRequest).filter(
        models.TripRequest.request_id == request_id
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    return trip

#Actualizar una solicitud de viaje
@router.put("/{request_id}", response_model=schemas.TripResponse)
def update_trip(request_id: int, trip: schemas.TripCreate, db: Session = Depends(get_db)):

    trip_query = db.query(models.TripRequest).filter(
        models.TripRequest.request_id == request_id
    )

    trip_db = trip_query.first()

    if not trip_db:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    trip_query.update(trip.dict(), synchronize_session=False)
    db.commit()

    return trip_query.first()

#Eliminar solicitud de viaje
@router.delete("/{request_id}")
def delete_trip(request_id: int, db: Session = Depends(get_db)):

    trip_query = db.query(models.TripRequest).filter(
        models.TripRequest.request_id == request_id
    )

    trip = trip_query.first()

    if not trip:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    trip_query.delete(synchronize_session=False)
    db.commit()

    return {"message": "Solicitud eliminada satisfactoriamente"}