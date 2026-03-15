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
    return routes


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

    new_route = models.Route(**route.model_dump())

    db.add(new_route)
    db.commit()
    db.refresh(new_route)

    return new_route


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