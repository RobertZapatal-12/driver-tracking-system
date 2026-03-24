from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con las rutas
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

    return route


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
        vehicle_id=route.vehicle_id,
        driver_id=vehicle.driver_id,
        origen=route.origen,
        destino=route.destino,
        estado=None
    )

    db.add(new_route)
    db.commit()
    db.refresh(new_route)

    return {
        "route_id": new_route.route_id,
        "vehicle_id": new_route.vehicle_id,
        "driver_id": new_route.driver_id,
        "origen": new_route.origen,
        "destino": new_route.destino,
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

    for key, value in route_data.model_dump().items():
        setattr(route, key, value)

    db.commit()
    db.refresh(route)

    return route


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

@router.get("/", response_model=list[schemas.RouteResponse])
def get_routes(db: Session = Depends(get_db)):
    routes = db.query(models.Route).join(models.Driver).all()

    return [
        {
            "route_id": r.route_id,
            "user_id": r.user_id,
            "vehicle_id": r.vehicle_id,
            "driver_id": r.driver_id,
            "origen": r.origen,
            "destino": r.destino,
            "fecha": r.fecha,
            "estado": r.estado,
            "driver_nombre": r.driver.nombre if r.driver else None
        }
        for r in routes
    ]