from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
import secrets
from datetime import datetime, date

# Se crea un router para manejar todas las rutas relacionadas con los request
router = APIRouter(
    prefix="/request", 
    tags=["Request"]   
)


# ─── Helper: enriquecer respuesta con nombres de operador/driver/vehicle ───
def _enrich_request(req, db):
    """Agrega operador_nombre, driver_nombre y vehicle_info al dict de respuesta"""
    data = {
        "request_id": req.request_id,
        "cliente": req.cliente,
        "fecha": req.fecha,
        "origen": req.origen,
        "destino": req.destino,
        "descripcion": req.descripcion,
        "tipo_vehiculo": req.tipo_vehiculo,
        "estado": req.estado,
        "sub_estado": req.sub_estado,
        "prioridad": req.prioridad,
        "user_id": req.user_id,
        "vehicle_id": req.vehicle_id,
        "driver_id": req.driver_id,
        "notas_operador": req.notas_operador,
        "tracking_code": req.tracking_code,
        "costo": req.costo,
        "lat_origen": req.lat_origen,
        "lon_origen": req.lon_origen,
        "lat_destino": req.lat_destino,
        "lon_destino": req.lon_destino,
        "operador_nombre": None,
        "driver_nombre": None,
        "vehicle_info": None,
    }

    # Nombre del operador desde la tabla users
    if req.user_id:
        user = db.query(models.User).filter(
            models.User.user_id == req.user_id
        ).first()
        if user:
            data["operador_nombre"] = user.nombre

    # Nombre del conductor
    if req.driver_id:
        driver = db.query(models.Driver).filter(
            models.Driver.driver_id == req.driver_id
        ).first()
        if driver:
            data["driver_nombre"] = driver.nombre

    # Info del vehículo
    if req.vehicle_id:
        vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.vehicle_id == req.vehicle_id
        ).first()
        if vehicle:
            data["vehicle_info"] = f"{vehicle.marca} {vehicle.modelo} - {vehicle.plate_number}"

    return data


# Crear request (secretaria crea con estado pendiente)
@router.post("/", response_model=schemas.RequestResponse)
def create_request(request: schemas.RequestCreate, db: Session = Depends(get_db)):

    new_request = models.Request(
        cliente=request.cliente,
        fecha=request.fecha,
        origen=request.origen,
        destino=request.destino,
        descripcion=request.descripcion,
        tipo_vehiculo=request.tipo_vehiculo,
        prioridad=request.prioridad,
        costo=request.costo,
        estado="pendiente",
        user_id=None,
        vehicle_id=None,
        driver_id=None,
        notas_operador=None,
        # ✅ Guardar coordenadas capturadas desde el mapa
        lat_origen=request.lat_origen,
        lon_origen=request.lon_origen,
        lat_destino=request.lat_destino,
        lon_destino=request.lon_destino,
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return _enrich_request(new_request, db)


# Helper for bulk enrichment to avoid N+1 queries
def _enrich_requests_bulk(requests, db):
    if not requests:
        return []
        
    user_ids = {r.user_id for r in requests if r.user_id}
    driver_ids = {r.driver_id for r in requests if r.driver_id}
    vehicle_ids = {r.vehicle_id for r in requests if r.vehicle_id}

    users = {u.user_id: u.nombre for u in db.query(models.User).filter(models.User.user_id.in_(user_ids)).all()} if user_ids else {}
    drivers = {d.driver_id: d.nombre for d in db.query(models.Driver).filter(models.Driver.driver_id.in_(driver_ids)).all()} if driver_ids else {}
    vehicles = {v.vehicle_id: f"{v.marca} {v.modelo} - {v.plate_number}" for v in db.query(models.Vehicle).filter(models.Vehicle.vehicle_id.in_(vehicle_ids)).all()} if vehicle_ids else {}

    result = []
    for req in requests:
        data = {
            "request_id": req.request_id,
            "cliente": req.cliente,
            "fecha": req.fecha,
            "origen": req.origen,
            "destino": req.destino,
            "descripcion": req.descripcion,
            "tipo_vehiculo": req.tipo_vehiculo,
            "estado": req.estado,
            "sub_estado": req.sub_estado,
            "prioridad": req.prioridad,
            "user_id": req.user_id,
            "vehicle_id": req.vehicle_id,
            "driver_id": req.driver_id,
            "notas_operador": req.notas_operador,
            "tracking_code": req.tracking_code,
            "costo": req.costo,
            "lat_origen": req.lat_origen,
            "lon_origen": req.lon_origen,
            "lat_destino": req.lat_destino,
            "lon_destino": req.lon_destino,
            "operador_nombre": users.get(req.user_id) if req.user_id else None,
            "driver_nombre": drivers.get(req.driver_id) if req.driver_id else None,
            "vehicle_info": vehicles.get(req.vehicle_id) if req.vehicle_id else None,
        }
        result.append(data)
    return result

# Obtener todos
@router.get("/", response_model=list[schemas.RequestResponse])
def get_requests(db: Session = Depends(get_db)):
    requests = db.query(models.Request).order_by(models.Request.request_id.desc()).all()
    return _enrich_requests_bulk(requests, db)


# ─── Estadísticas del día: servicios de hoy vs ayer ────────────────────────────
@router.get("/stats/hoy")
def get_stats_hoy(db: Session = Depends(get_db)):
    """Devuelve el total de solicitudes creadas hoy y ayer para comparar en el dashboard."""
    today = date.today()
    hoy_str = today.isoformat()          # "YYYY-MM-DD"

    from datetime import timedelta
    ayer = (today - timedelta(days=1)).isoformat()

    # El campo `fecha` es String en el modelo — filtramos por prefijo de fecha ISO
    total_hoy = db.query(models.Request).filter(
        models.Request.fecha.like(f"{hoy_str}%")
    ).count()

    total_ayer = db.query(models.Request).filter(
        models.Request.fecha.like(f"{ayer}%")
    ).count()

    # También contamos usando registrado_en (DateTime) como fallback
    if total_hoy == 0:
        from sqlalchemy import func, cast
        total_hoy = db.query(models.Request).filter(
            func.date(models.Request.registrado_en) == today
        ).count()
        total_ayer = db.query(models.Request).filter(
            func.date(models.Request.registrado_en) == (today - __import__('datetime').timedelta(days=1))
        ).count()

    return {
        "hoy": total_hoy,
        "ayer": total_ayer,
    }


# Obtener solicitudes pendientes (para operadores)
@router.get("/pendientes", response_model=list[schemas.RequestResponse])
def get_pending_requests(db: Session = Depends(get_db)):
    requests = db.query(models.Request).filter(
        models.Request.estado == "pendiente"
    ).all()
    return _enrich_requests_bulk(requests, db)


# Obtener por id
@router.get("/{request_id}", response_model=schemas.RequestResponse)
def get_request(request_id: int, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(
        models.Request.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Request no encontrado")

    return _enrich_request(request, db)


# Operador toma la solicitud
@router.patch("/{request_id}/tomar", response_model=schemas.RequestResponse)
def tomar_request(request_id: int, data: schemas.RequestTomar, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(
        models.Request.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if request.estado != "pendiente":
        raise HTTPException(status_code=400, detail="La solicitud no está pendiente")
    if request.user_id is not None:
        raise HTTPException(status_code=400, detail="La solicitud ya tiene un operador asignado")

    # Verificar que el user_id existe en la tabla users
    user = db.query(models.User).filter(models.User.user_id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    request.estado = "en_proceso"
    request.user_id = data.user_id

    db.commit()
    db.refresh(request)

    return _enrich_request(request, db)


# Operador actualiza la solicitud (validar, asignar recursos, notas)
@router.patch("/{request_id}/actualizar", response_model=schemas.RequestResponse)
def actualizar_request(request_id: int, data: schemas.RequestOperadorUpdate, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(
        models.Request.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if request.estado != "en_proceso":
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar solicitudes en proceso")

    if request.user_id != data.user_id:
        raise HTTPException(status_code=403, detail="Solo el operador asignado puede actualizar esta solicitud")

    # Actualizar campos que vengan con valor
    if data.origen is not None:
        request.origen = data.origen
    if data.destino is not None:
        request.destino = data.destino
    if data.descripcion is not None:
        request.descripcion = data.descripcion
    if data.prioridad is not None:
        request.prioridad = data.prioridad
    if data.tipo_vehiculo is not None:
        request.tipo_vehiculo = data.tipo_vehiculo
    if data.estado is not None:
        request.estado = data.estado
    if data.sub_estado is not None:
        request.sub_estado = data.sub_estado
    if data.notas_operador is not None:
        request.notas_operador = data.notas_operador

    # Asignar vehículo
    if data.vehicle_id is not None:
        vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.vehicle_id == data.vehicle_id
        ).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        request.vehicle_id = data.vehicle_id

    # Asignar conductor (con validación de conflicto)
    if data.driver_id is not None:
        # 1. Verificar si el conductor ya tiene un viaje 'en_proceso'
        busy_driver = db.query(models.Request).filter(
            models.Request.driver_id == data.driver_id,
            models.Request.estado == "en_proceso",
            models.Request.request_id != request_id
        ).first()
        
        if busy_driver:
            raise HTTPException(
                status_code=400, 
                detail=f"El conductor ya está asignado a otro viaje en proceso (ID: {busy_driver.request_id})"
            )

        driver = db.query(models.Driver).filter(
            models.Driver.driver_id == data.driver_id
        ).first()
        if not driver:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")

        # 2. Verificar si el conductor está 'Desconectado' (bloquea asignación)
        if (driver.estado or "").lower() == "desconectado":
            raise HTTPException(
                status_code=400, 
                detail=f"No se puede asignar a {driver.nombre} porque su estado es 'Desconectado'."
            )
        
        request.driver_id = data.driver_id
        
        # Al asignar conductor, el viaje pasa a estar 'buscando_cliente' por defecto
        if request.sub_estado == "pendiente":
            request.sub_estado = "buscando_cliente"

        # Generar código de seguimiento si no tiene uno
        if not request.tracking_code:
            request.tracking_code = secrets.token_hex(4).upper()
            print(f"DEBUG: Generado código {request.tracking_code} para solicitud {request_id}")

    # Actualizar costo
    if data.costo is not None:
        request.costo = data.costo

    # Actualizar coordenadas si vienen en la data
    if data.lat_origen is not None: request.lat_origen = data.lat_origen
    if data.lon_origen is not None: request.lon_origen = data.lon_origen
    if data.lat_destino is not None: request.lat_destino = data.lat_destino
    if data.lon_destino is not None: request.lon_destino = data.lon_destino

    db.commit()
    db.refresh(request)

    return _enrich_request(request, db)


# Operador completa la solicitud
@router.patch("/{request_id}/completar", response_model=schemas.RequestResponse)
def completar_request(request_id: int, data: schemas.RequestCompletar, db: Session = Depends(get_db)):
    request = db.query(models.Request).filter(
        models.Request.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if request.estado != "en_proceso":
        raise HTTPException(status_code=400, detail="La solicitud no está en proceso")
    if request.user_id != data.user_id:
        raise HTTPException(status_code=403, detail="Solo el operador asignado puede completar esta solicitud")

    request.estado = "completada"
    request.sub_estado = "completada"
    # ✅ Invalidar código de rastreo para que el tracking del cliente quede inactivo
    request.tracking_code = None

    db.commit()
    db.refresh(request)

    return _enrich_request(request, db)


# Actualizar (edición general - solo pendientes)
@router.put("/{request_id}", response_model=schemas.RequestResponse)
def update_request(request_id: int, request: schemas.RequestCreate, db: Session = Depends(get_db)):
    request_db = db.query(models.Request).filter(
        models.Request.request_id == request_id
    ).first()

    if not request_db:
        raise HTTPException(status_code=404, detail="Request no encontrado")

    request_db.cliente       = request.cliente
    request_db.fecha         = request.fecha
    request_db.origen        = request.origen
    request_db.destino       = request.destino
    request_db.descripcion   = request.descripcion
    request_db.tipo_vehiculo = request.tipo_vehiculo
    request_db.prioridad     = request.prioridad
    if request.costo is not None:
        request_db.costo = request.costo

    # ✅ Actualizar coordenadas si vienen del formulario
    if request.lat_origen  is not None: request_db.lat_origen  = request.lat_origen
    if request.lon_origen  is not None: request_db.lon_origen  = request.lon_origen
    if request.lat_destino is not None: request_db.lat_destino = request.lat_destino
    if request.lon_destino is not None: request_db.lon_destino = request.lon_destino

    db.commit()
    db.refresh(request_db)

    return _enrich_request(request_db, db)


# Eliminar
@router.delete("/{request_id}")
def delete_request(request_id: int, db: Session = Depends(get_db)):
    request_query = db.query(models.Request).filter(
        models.Request.request_id == request_id
    )
    request = request_query.first()

    if not request:
        raise HTTPException(status_code=404, detail="Request no encontrado")

    request_query.delete(synchronize_session=False)
    db.commit()

    return {"message": "Request eliminado"}