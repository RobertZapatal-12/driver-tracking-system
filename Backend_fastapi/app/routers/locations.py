from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas
from datetime import datetime

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

@router.get("/track/{code}")
def track_service(code: str, isAdmin: bool = False, db: Session = Depends(get_db)):
    # 1. Intentar buscar por código hexadecimal (tracking_code)
    request = db.query(models.Request).filter(models.Request.tracking_code == code).first()
    
    # 2. Si no se encuentra y el código es numérico, podría ser un driver_id (para el Centro de Control)
    if not request and code.isdigit():
        request = db.query(models.Request).filter(
            models.Request.driver_id == int(code),
            models.Request.estado == "en_proceso"
        ).order_by(models.Request.request_id.desc()).first()

    # 3. Validar existencia
    if not request:
        # Caso especial para admin: Si solo busca un conductor que no tiene viaje activo
        if isAdmin and code.isdigit():
            driver = db.query(models.Driver).filter(models.Driver.driver_id == int(code)).first()
            if driver:
                latest_loc = db.query(models.Location)\
                    .filter(models.Location.driver_id == driver.driver_id)\
                    .order_by(models.Location.location_id.desc())\
                    .first()
                return {
                    "is_only_driver": True,
                    "conductor": {
                        "nombre": driver.nombre,
                        "imagen": driver.imagen,
                        "lat": latest_loc.latitud if latest_loc else None,
                        "lng": latest_loc.longitud if latest_loc else None,
                        "velocidad": latest_loc.velocidad if latest_loc else 0
                    }
                }
        return {"error": "Código o ID no encontrado o sin servicio activo"}
    
    # 4. Verificar horario si no es admin
    if not isAdmin:
        try:
            # Formato esperado: "YYYY-MM-DD HH:MM"
            scheduled_time = datetime.strptime(request.fecha, "%Y-%m-%d %H:%M")
            if datetime.now() < scheduled_time:
                return {
                    "error": "Servicio no iniciado, por favor intentar en horario correspondiente",
                    "status": "programado",
                    "fecha_inicio": request.fecha
                }
        except Exception as e:
            # Si el formato falla (ej. solo fecha), permitimos para no bloquear
            pass

    # 3. Datos básicos de la ruta
    tracking_data = {
        "request_id": request.request_id,
        "codigo": request.tracking_code,
        "cliente": request.cliente,
        "estado": request.estado,
        "sub_estado": request.sub_estado,
        "origen": {
            "nombre": request.origen,
            "lat": request.lat_origen,
            "lng": request.lon_origen
        },
        "destino": {
            "nombre": request.destino,
            "lat": request.lat_destino,
            "lng": request.lon_destino
        },
        "conductor": None
    }

    # 4. Si tiene conductor, buscar su ubicación más reciente
    if request.driver_id:
        driver = db.query(models.Driver).filter(models.Driver.driver_id == request.driver_id).first()
        latest_loc = db.query(models.Location)\
            .filter(models.Location.driver_id == request.driver_id)\
            .order_by(models.Location.location_id.desc())\
            .first()
            
        if driver:
            tracking_data["conductor"] = {
                "nombre": driver.nombre,
                "imagen": driver.imagen,
                "lat": latest_loc.latitud if latest_loc else None,
                "lng": latest_loc.longitud if latest_loc else None,
                "velocidad": latest_loc.velocidad if latest_loc else 0
            }

    return tracking_data

@router.get("/latest")
def get_latest_locations(db: Session = Depends(get_db)):
    subquery = (
        db.query(
            models.Location.driver_id,
            func.max(models.Location.location_id).label("max_location_id")
        )
        .group_by(models.Location.driver_id)
        .subquery()
    )

    results = (
        db.query(models.Location, models.Driver)
        .join(subquery, models.Location.location_id == subquery.c.max_location_id)
        .join(models.Driver, models.Driver.driver_id == models.Location.driver_id)
        .all()
    )

    data = []
    for location, driver in results:
        data.append({
            "driver_id": driver.driver_id,
            "nombre": driver.nombre,
            "imagen": driver.imagen,
            "latitud": location.latitud,
            "longitud": location.longitud,
            "velocidad": location.velocidad,
            "registrado_en": getattr(location, "registrado_en", None),
        })

    return data

@router.put("/{location_id}")
def update_location(location_id: int, location: schemas.LocationCreate, db: Session = Depends(get_db)):
    db_location = db.query(models.Location).filter(models.Location.location_id == location_id).first()

    if not db_location:
        return {"error": "Ubicación no encontrada"}

    for key, value in location.dict().items():
        setattr(db_location, key, value)

    db.commit()
    db.refresh(db_location)

    return db_location

@router.delete("/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(models.Location).filter(models.Location.location_id == location_id).first()

    if not location:
        return {"error": "Ubicación no encontrada"}

    db.delete(location)
    db.commit()

    return {"mensaje": "Ubicación eliminada correctamente"}