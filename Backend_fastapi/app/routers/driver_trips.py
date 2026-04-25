from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from datetime import datetime

router = APIRouter(
    prefix="/driver-trips",
    tags=["Driver Trips"]
)


# ── Iniciar viaje ───────────────────────────────────────────
@router.post("/", response_model=schemas.DriverTripResponse)
def start_trip(trip: schemas.DriverTripCreate, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(
        models.Driver.driver_id == trip.driver_id
    ).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    # Verificar que no haya un viaje activo
    active = db.query(models.DriverTrip).filter(
        models.DriverTrip.driver_id == trip.driver_id,
        models.DriverTrip.estado == "En curso"
    ).first()
    if active:
        raise HTTPException(
            status_code=400,
            detail="El conductor ya tiene un viaje en curso"
        )

    new_trip = models.DriverTrip(
        driver_id=trip.driver_id,
        request_id=trip.request_id,
        lat_inicio=trip.lat_inicio,
        lon_inicio=trip.lon_inicio,
        estado="En curso",
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip


# ── Finalizar viaje ─────────────────────────────────────────
@router.patch("/{trip_id}/end", response_model=schemas.DriverTripResponse)
def end_trip(
    trip_id: int,
    end_data: schemas.DriverTripEnd,
    db: Session = Depends(get_db)
):
    trip = db.query(models.DriverTrip).filter(
        models.DriverTrip.trip_id == trip_id
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if trip.estado == "Completado":
        raise HTTPException(status_code=400, detail="El viaje ya está completado")

    trip.fin = datetime.utcnow()
    trip.lat_fin = end_data.lat_fin
    trip.lon_fin = end_data.lon_fin
    trip.estado = "Completado"

    # Sincronizar con la tabla Request y anular tracking_code
    if trip.request_id:
        request = db.query(models.Request).filter(models.Request.request_id == trip.request_id).first()
        if request:
            request.estado = "completada"
            request.sub_estado = "completada"
            # ✅ Invalidar código de rastreo para que el tracking del cliente quede inactivo
            request.tracking_code = None

    db.commit()
    db.refresh(trip)
    return trip


# ── Conductor llegó al punto de recogida ─────────────────────
@router.patch("/{trip_id}/arrived", response_model=schemas.DriverTripResponse)
def driver_arrived_at_pickup(
    trip_id: int,
    db: Session = Depends(get_db)
):
    """El conductor llegó al punto de recogida. Cambia sub_estado a 'con_cliente'."""
    trip = db.query(models.DriverTrip).filter(
        models.DriverTrip.trip_id == trip_id
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if trip.estado == "Completado":
        raise HTTPException(status_code=400, detail="El viaje ya está completado")

    # Actualizar sub_estado en la Request asociada
    if trip.request_id:
        request = db.query(models.Request).filter(
            models.Request.request_id == trip.request_id
        ).first()
        if request:
            request.sub_estado = "con_cliente"

    db.commit()
    db.refresh(trip)
    return trip


# ── Viaje activo de un conductor ────────────────────────────
@router.get("/driver/{driver_id}/active", response_model=schemas.DriverTripResponse)
def get_active_trip(driver_id: int, db: Session = Depends(get_db)):
    trip = db.query(models.DriverTrip).filter(
        models.DriverTrip.driver_id == driver_id,
        models.DriverTrip.estado == "En curso"
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="No hay viaje activo")
    return trip


# ── Historial de viajes de un conductor ─────────────────────
@router.get("/driver/{driver_id}", response_model=list[schemas.DriverTripResponse])
def get_trips_by_driver(driver_id: int, db: Session = Depends(get_db)):
    trips = db.query(models.DriverTrip).filter(
        models.DriverTrip.driver_id == driver_id
    ).order_by(models.DriverTrip.inicio.desc()).all()
    return trips


# ── Todos los viajes ────────────────────────────────────────
@router.get("/", response_model=list[schemas.DriverTripResponse])
def get_all_trips(db: Session = Depends(get_db)):
    return db.query(models.DriverTrip).order_by(
        models.DriverTrip.inicio.desc()
    ).all()
