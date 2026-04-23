from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/route",
    tags=["Route"]
)

# Obtener todas las rutas
@router.get("/", response_model=list[schemas.RouteResponse])
def get_routes(db: Session = Depends(get_db)):
    routes = db.query(models.Route).all()

    response = []
    for r in routes:
        driver_nombre = None

        if r.driver_id:
            driver = db.query(models.Driver).filter(
                models.Driver.driver_id == r.driver_id
            ).first()
            if driver:
                driver_nombre = driver.nombre

        response.append({
            "route_id": r.route_id,
            "user_id": r.user_id,
            "vehicle_id": r.vehicle_id,
            "driver_id": r.driver_id,
            "origen": r.origen,
            "destino": r.destino,
            "fecha": r.fecha,
            "estado": r.estado,
            "driver_nombre": driver_nombre
        })

    return response


# Obtener ruta por id
@router.get("/{route_id}", response_model=schemas.RouteResponse)
def get_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(models.Route).filter(
        models.Route.route_id == route_id
    ).first()

    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    driver_nombre = None
    if route.driver_id:
        driver = db.query(models.Driver).filter(
            models.Driver.driver_id == route.driver_id
        ).first()
        if driver:
            driver_nombre = driver.nombre

    return {
        "route_id": route.route_id,
        "user_id": route.user_id,
        "vehicle_id": route.vehicle_id,
        "driver_id": route.driver_id,
        "origen": route.origen,
        "destino": route.destino,
        "fecha": route.fecha,
        "estado": route.estado,
        "driver_nombre": driver_nombre
    }


# Crear ruta
@router.post("/", response_model=schemas.RouteResponse)
def create_route(route: schemas.RouteCreate, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(
        models.Vehicle.vehicle_id == route.vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    if not vehicle.driver_id:
        raise HTTPException(status_code=400, detail="El vehículo no tiene un conductor asignado")

    driver = db.query(models.Driver).filter(
        models.Driver.driver_id == vehicle.driver_id
    ).first()

    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    new_route = models.Route(
        user_id=route.user_id,
        vehicle_id=route.vehicle_id,
        driver_id=vehicle.driver_id,
        origen=route.origen,
        destino=route.destino,
        lat_origen=route.lat_origen,
        lon_origen=route.lon_origen,
        lat_destino=route.lat_destino,
        lon_destino=route.lon_destino,
        estado="Pendiente"
    )

    db.add(new_route)
    db.commit()
    db.refresh(new_route)

    return {
        "route_id": new_route.route_id,
        "user_id": new_route.user_id,
        "vehicle_id": new_route.vehicle_id,
        "driver_id": new_route.driver_id,
        "origen": new_route.origen,
        "destino": new_route.destino,
        "lat_origen": new_route.lat_origen,
        "lon_origen": new_route.lon_origen,
        "lat_destino": new_route.lat_destino,
        "lon_destino": new_route.lon_destino,
        "fecha": new_route.fecha,
        "estado": new_route.estado,
        "driver_nombre": driver.nombre
    }


# Actualizar ruta
@router.put("/{route_id}", response_model=schemas.RouteResponse)
def update_route(route_id: int, route_data: schemas.RouteCreate, db: Session = Depends(get_db)):
    route = db.query(models.Route).filter(
        models.Route.route_id == route_id
    ).first()

    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    vehicle = db.query(models.Vehicle).filter(
        models.Vehicle.vehicle_id == route_data.vehicle_id
    ).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    if not vehicle.driver_id:
        raise HTTPException(status_code=400, detail="El vehículo no tiene un conductor asignado")

    driver = db.query(models.Driver).filter(
        models.Driver.driver_id == vehicle.driver_id
    ).first()

    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    route.user_id    = route_data.user_id
    route.vehicle_id = route_data.vehicle_id
    route.driver_id  = vehicle.driver_id
    route.origen     = route_data.origen
    route.destino    = route_data.destino

    # ── Actualizar coordenadas si se proveen ─────────────
    if route_data.lat_origen  is not None: route.lat_origen  = route_data.lat_origen
    if route_data.lon_origen  is not None: route.lon_origen  = route_data.lon_origen
    if route_data.lat_destino is not None: route.lat_destino = route_data.lat_destino
    if route_data.lon_destino is not None: route.lon_destino = route_data.lon_destino

    db.commit()
    db.refresh(route)

    return {
        "route_id": route.route_id,
        "user_id": route.user_id,
        "vehicle_id": route.vehicle_id,
        "driver_id": route.driver_id,
        "origen": route.origen,
        "destino": route.destino,
        "lat_origen": route.lat_origen,
        "lon_origen": route.lon_origen,
        "lat_destino": route.lat_destino,
        "lon_destino": route.lon_destino,
        "fecha": route.fecha,
        "estado": route.estado,
        "driver_nombre": driver.nombre
    }


# Obtener rutas asignadas a un conductor
@router.get("/driver/{driver_id}", response_model=list[schemas.RouteResponse])
def get_routes_by_driver(driver_id: int, db: Session = Depends(get_db)):
    routes = db.query(models.Route).filter(
        models.Route.driver_id == driver_id
    ).order_by(models.Route.fecha.desc()).all()

    response = []
    for r in routes:
        driver_nombre = None
        if r.driver_id:
            driver = db.query(models.Driver).filter(
                models.Driver.driver_id == r.driver_id
            ).first()
            if driver:
                driver_nombre = driver.nombre

        response.append({
            "route_id": r.route_id,
            "user_id": r.user_id,
            "vehicle_id": r.vehicle_id,
            "driver_id": r.driver_id,
            "origen": r.origen,
            "destino": r.destino,
            "lat_origen": r.lat_origen,
            "lon_origen": r.lon_origen,
            "lat_destino": r.lat_destino,
            "lon_destino": r.lon_destino,
            "fecha": r.fecha,
            "estado": r.estado,
            "driver_nombre": driver_nombre
        })

    return response

# Historial completo de viajes completados de un conductor
@router.get("/driver/{driver_id}/history")
def get_driver_history(driver_id: int, db: Session = Depends(get_db)):
    routes = db.query(models.Route).filter(
        models.Route.driver_id == driver_id,
        models.Route.estado == "Completado"
    ).order_by(models.Route.fecha.desc()).all()

    response = []
    for r in routes:
        response.append({
            "route_id": r.route_id,
            "driver_id": r.driver_id,
            "origen": r.origen,
            "destino": r.destino,
            "lat_origen": r.lat_origen,
            "lon_origen": r.lon_origen,
            "lat_destino": r.lat_destino,
            "lon_destino": r.lon_destino,
            "fecha": r.fecha,
            "estado": r.estado,
        })

    return response


# Actualizar estado de una ruta (desde la app móvil)
@router.patch("/{route_id}/status", response_model=schemas.RouteResponse)
def update_route_status(
    route_id: int,
    status_data: schemas.RouteStatusUpdate,
    db: Session = Depends(get_db)
):
    route = db.query(models.Route).filter(
        models.Route.route_id == route_id
    ).first()

    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    valid_statuses = ["Pendiente", "Aceptado", "En camino", "Completado"]
    if status_data.estado not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Debe ser uno de: {valid_statuses}"
        )

    route.estado = status_data.estado
    db.commit()
    db.refresh(route)

    driver_nombre = None
    if route.driver_id:
        driver = db.query(models.Driver).filter(
            models.Driver.driver_id == route.driver_id
        ).first()
        if driver:
            driver_nombre = driver.nombre

    return {
        "route_id": route.route_id,
        "user_id": route.user_id,
        "vehicle_id": route.vehicle_id,
        "driver_id": route.driver_id,
        "origen": route.origen,
        "destino": route.destino,
        "lat_origen": route.lat_origen,
        "lon_origen": route.lon_origen,
        "lat_destino": route.lat_destino,
        "lon_destino": route.lon_destino,
        "fecha": route.fecha,
        "estado": route.estado,
        "driver_nombre": driver_nombre
    }


# Eliminar ruta
@router.delete("/{route_id}")
def delete_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(models.Route).filter(
        models.Route.route_id == route_id
    ).first()

    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    db.delete(route)
    db.commit()

    return {"message": "Ruta eliminada satisfactoriamente"}