from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/drivers",
    tags=["Drivers"]
)


@router.get("/")
def get_drivers(db: Session = Depends(get_db)):
    return db.query(models.Driver).all()


@router.get("/{driver_id}")
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    return db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()


@router.post("/")
def create_driver(driver: schemas.DriverCreate, db: Session = Depends(get_db)):
    new_driver = models.Driver(**driver.dict())

    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)

    return new_driver