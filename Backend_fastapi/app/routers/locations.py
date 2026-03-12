from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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