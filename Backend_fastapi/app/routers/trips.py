from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)


@router.get("/", response_model=list[schemas.TripResponse])
def get_trips(db: Session = Depends(get_db)):
    return db.query(models.TripRequest).all()


@router.post("/", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):

    new_trip = models.TripRequest(**trip.dict())

    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    return new_trip