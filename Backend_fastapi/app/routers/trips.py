from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
import secrets
from datetime import datetime

router = APIRouter(
    prefix="/route",
    tags=["Route"]
)

# Obtener todas las rutas
@router.get("/", response_model=list[schemas.RouteResponse])
def get_routes(db: Session = Depends(get_db)):
    requests = db.query(models.Request).filter(
        models.Request.cliente == "Asignación Directa"
    ).all()

    response = []
    for r in requests:
        driver_nombre = None

        if r.driver_id:
            driver = db.query(models.Driver).filter(
                models.Driver.driver_id == r.driver_id
            ).first()
            if driver:
                driver_nombre = driver.nombre

        response.append({
            "route_id": r.request_id,
            "user_id": r.user_id,
            "vehicle_id": r.vehicle_id or 0,
            "driver_id": r.driver_id,
            "origen": r.origen,
            "destino": r.destino,
            "lat_origen": r.lat_origen,
            "lon_origen": r.lon_origen,
            "lat_destino": r.lat_destino,
            "lon_destino": r.lon_destino,
            "fecha": r.registrado_en,
            "estado": r.estado.capitalize() if r.estado else "Pendiente",
            "driver_nombre": driver_nombre
        })

    return response


# Obtener ruta por id
@router.get("/{route_id}", response_model=schemas.RouteResponse)
def get_route(route_id: int, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(
        models.Request.request_id == route_id,
        models.Request.cliente == "Asignación Directa"
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    driver_nombre = None
    if request.driver_id:
        driver = db.query(models.Driver).filter(
            models.Driver.driver_id == request.driver_id
        ).first()
        if driver:
            driver_nombre = driver.nombre

    return {
        "route_id": request.request_id,
        "user_id": request.user_id,
        "vehicle_id": request.vehicle_id or 0,
        "driver_id": request.driver_id,
        "origen": request.origen,
        "destino": request.destino,
        "lat_origen": request.lat_origen,
        "lon_origen": request.lon_origen,
        "lat_destino": request.lat_destino,
        "lon_destino": request.lon_destino,
        "fecha": request.registrado_en,
        "estado": request.estado.capitalize() if request.estado else "Pendiente",
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

    new_request = models.Request(
        cliente="Asignación Directa",
        fecha=datetime.now().strftime("%Y-%m-%d %H:%M"),
        origen=route.origen,
        destino=route.destino,
        descripcion="Viaje asignado directamente desde el módulo de Rutas",
        tipo_vehiculo="Asignado",
        prioridad="media",
        user_id=route.user_id,
        vehicle_id=route.vehicle_id,
        driver_id=vehicle.driver_id,
        estado="en_proceso",
        sub_estado="buscando_cliente",
        tracking_code=secrets.token_hex(4).upper(),
        lat_origen=route.lat_origen,
        lon_origen=route.lon_origen,
        lat_destino=route.lat_destino,
        lon_destino=route.lon_destino,
        costo=0.0
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return {
        "route_id": new_request.request_id,
        "user_id": new_request.user_id,
        "vehicle_id": new_request.vehicle_id or 0,
        "driver_id": new_request.driver_id,
        "origen": new_request.origen,
        "destino": new_request.destino,
        "lat_origen": new_request.lat_origen,
        "lon_origen": new_request.lon_origen,
        "lat_destino": new_request.lat_destino,
        "lon_destino": new_request.lon_destino,
        "fecha": new_request.registrado_en,
        "estado": new_request.estado.capitalize() if new_request.estado else "Pendiente",
        "driver_nombre": driver.nombre
    }


# Actualizar ruta
@router.put("/{route_id}", response_model=schemas.RouteResponse)
def update_route(route_id: int, route_data: schemas.RouteCreate, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(
        models.Request.request_id == route_id,
        models.Request.cliente == "Asignación Directa"
    ).first()

    if not request:
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

    request.user_id    = route_data.user_id
    request.vehicle_id = route_data.vehicle_id
    request.driver_id  = vehicle.driver_id
    request.origen     = route_data.origen
    request.destino    = route_data.destino

    # ── Actualizar coordenadas si se proveen ─────────────
    if route_data.lat_origen  is not None: request.lat_origen  = route_data.lat_origen
    if route_data.lon_origen  is not None: request.lon_origen  = route_data.lon_origen
    if route_data.lat_destino is not None: request.lat_destino = route_data.lat_destino
    if route_data.lon_destino is not None: request.lon_destino = route_data.lon_destino

    db.commit()
    db.refresh(request)

    return {
        "route_id": request.request_id,
        "user_id": request.user_id,
        "vehicle_id": request.vehicle_id or 0,
        "driver_id": request.driver_id,
        "origen": request.origen,
        "destino": request.destino,
        "lat_origen": request.lat_origen,
        "lon_origen": request.lon_origen,
        "lat_destino": request.lat_destino,
        "lon_destino": request.lon_destino,
        "fecha": request.registrado_en,
        "estado": request.estado.capitalize() if request.estado else "Pendiente",
        "driver_nombre": driver.nombre
    }


# Obtener rutas asignadas a un conductor
@router.get("/driver/{driver_id}", response_model=list[schemas.RouteResponse])
def get_routes_by_driver(driver_id: int, db: Session = Depends(get_db)):
    requests = db.query(models.Request).filter(
        models.Request.driver_id == driver_id,
        models.Request.estado != "completada"
    ).order_by(models.Request.fecha.desc()).all()

    response = []
    for r in requests:
        driver_nombre = None
        if r.driver_id:
            driver = db.query(models.Driver).filter(
                models.Driver.driver_id == r.driver_id
            ).first()
            if driver:
                driver_nombre = driver.nombre

        mobile_estado = r.estado
        if r.estado == "en_proceso":
            if r.sub_estado == "buscando_cliente" or r.sub_estado == "pendiente":
                mobile_estado = "Pendiente"
            elif r.sub_estado == "aceptado":
                mobile_estado = "Aceptado"
            elif r.sub_estado == "en_camino" or r.sub_estado == "con_cliente":
                mobile_estado = "En camino"

        response.append({
            "route_id": r.request_id,
            "user_id": r.user_id,
            "vehicle_id": r.vehicle_id,
            "driver_id": r.driver_id,
            "origen": r.origen,
            "destino": r.destino,
            "lat_origen": r.lat_origen,
            "lon_origen": r.lon_origen,
            "lat_destino": r.lat_destino,
            "lon_destino": r.lon_destino,
            "fecha": str(r.fecha) if r.fecha else None,
            "estado": mobile_estado,
            "driver_nombre": driver_nombre,
            "descripcion": r.descripcion,
            "notas_operador": r.notas_operador
        })

    return response

# Historial completo de viajes completados de un conductor
@router.get("/driver/{driver_id}/history")
def get_driver_history(driver_id: int, db: Session = Depends(get_db)):
    requests = db.query(models.Request).filter(
        models.Request.driver_id == driver_id,
        models.Request.estado == "completada"
    ).order_by(models.Request.fecha.desc()).all()

    response = []
    for r in requests:
        response.append({
            "route_id": r.request_id,
            "driver_id": r.driver_id,
            "origen": r.origen,
            "destino": r.destino,
            "lat_origen": r.lat_origen,
            "lon_origen": r.lon_origen,
            "lat_destino": r.lat_destino,
            "lon_destino": r.lon_destino,
            "fecha": str(r.fecha) if r.fecha else None,
            "estado": "Completado",
            "descripcion": r.descripcion,
            "notas_operador": r.notas_operador
        })

    return response


# Actualizar estado de una ruta (desde la app móvil)
@router.patch("/{route_id}/status", response_model=schemas.RouteResponse)
def update_route_status(
    route_id: int,
    status_data: schemas.RouteStatusUpdate,
    db: Session = Depends(get_db)
):
    request = db.query(models.Request).filter(
        models.Request.request_id == route_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    valid_statuses = ["Pendiente", "Aceptado", "En camino", "Completado"]
    if status_data.estado not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Debe ser uno de: {valid_statuses}"
        )

    # Actualizar según el flujo de la app móvil para que se refleje en la web
    if status_data.estado == "Aceptado":
        request.estado = "en_proceso"
        request.sub_estado = "aceptado"
    elif status_data.estado == "En camino":
        request.estado = "en_proceso"
        request.sub_estado = "en_camino"
    elif status_data.estado == "Completado":
        request.estado = "completada"
        request.sub_estado = "completada"
        request.tracking_code = None

    db.commit()
    db.refresh(request)

    driver_nombre = None
    if request.driver_id:
        driver = db.query(models.Driver).filter(
            models.Driver.driver_id == request.driver_id
        ).first()
        if driver:
            driver_nombre = driver.nombre

    return {
        "route_id": request.request_id,
        "user_id": request.user_id,
        "vehicle_id": request.vehicle_id,
        "driver_id": request.driver_id,
        "origen": request.origen,
        "destino": request.destino,
        "lat_origen": request.lat_origen,
        "lon_origen": request.lon_origen,
        "lat_destino": request.lat_destino,
        "lon_destino": request.lon_destino,
        "fecha": str(request.fecha) if request.fecha else None,
        "estado": status_data.estado,
        "driver_nombre": driver_nombre
    }


# Eliminar ruta
@router.delete("/{route_id}")
def delete_route(route_id: int, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(
        models.Request.request_id == route_id,
        models.Request.cliente == "Asignación Directa"
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    db.delete(request)
    db.commit()

    return {"message": "Ruta eliminada satisfactoriamente"}