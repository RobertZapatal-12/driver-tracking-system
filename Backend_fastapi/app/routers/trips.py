from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con las rutas
router = APIRouter(
    prefix="/route", 
    tags=["Route"]   
)

#Obtener todos las rutas
@router.get("/", response_model=list[schemas.TripResponse])
def get_trip_requests(db: Session = Depends(get_db)):
    requests = db.query(models.TripRequest).all()
    return requests

# Endpoint para crear una nueva ruta
@router.post("/", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):

    new_trip = models.TripRequest(**trip.dict(), estado="Pendiente")

    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    return new_trip

#Obtener rutas por id
@router.get("/{request_id}", response_model=schemas.TripResponse)
def get_trip_request(request_id: int, db: Session = Depends(get_db)):

    trip = db.query(models.TripRequest).filter(
        models.TripRequest.request_id == request_id
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    return trip

#Actualizar una  ruta
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

#Eliminar ruta
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