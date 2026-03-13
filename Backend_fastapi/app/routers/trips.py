from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con los viajes
router = APIRouter(
    prefix="/trips", # Todas las rutas comenzarán con /trips
    tags=["Trips"]   # Nombre que aparecerá en la documentación automática de FastAPI
)

# Endpoint para obtener todos los viajes registrados en la base de dato
@router.get("/", response_model=list[schemas.TripResponse])
def get_trips(db: Session = Depends(get_db)):

    # Realiza una consulta a la tabla TripRequest y devuelve todos los registros
    return db.query(models.TripRequest).all()

# Endpoint para crear una nueva solicitud de viaje
@router.post("/", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):

    # Convierte los datos recibidos del schema TripCreate en un objeto del modelo TripRequest
    new_trip = models.TripRequest(**trip.dict())

    # Agrega el nuevo viaje a la sesión de la base de datos
    db.add(new_trip)
    
    # Guarda el nuevo registro en la base de datos
    db.commit()

    # Actualiza el objeto con los datos generados por la base de datos (por ejemplo el ID)
    db.refresh(new_trip)

    # Devuelve el viaje recién creado
    return new_trip