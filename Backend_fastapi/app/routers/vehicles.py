from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"]
)


@router.get("/", response_model=list[schemas.VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    try:
        return db.query(models.Vehicle).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo vehículos: {str(e)}")


@router.get("/{vehicle_id}", response_model=schemas.VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    try:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()

        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        return vehicle
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo vehículo: {str(e)}")


@router.post("/", response_model=schemas.VehicleResponse)
def create_vehicle(vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):
    try:
        new_vehicle = models.Vehicle(**vehicle.dict())

        db.add(new_vehicle)
        db.commit()
        db.refresh(new_vehicle)

        return new_vehicle
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando vehículo: {str(e)}")


@router.put("/{vehicle_id}", response_model=schemas.VehicleResponse)
def update_vehicle(vehicle_id: int, vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):
    try:
        db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()

        if not db_vehicle:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        for key, value in vehicle.dict().items():
            setattr(db_vehicle, key, value)

        db.commit()
        db.refresh(db_vehicle)

        return db_vehicle
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error actualizando vehículo: {str(e)}")


@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    try:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()

        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        db.delete(vehicle)
        db.commit()

        return {"mensaje": "Vehículo eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error eliminando vehículo: {str(e)}")