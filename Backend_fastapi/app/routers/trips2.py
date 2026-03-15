from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con los request
router = APIRouter(
    prefix="/request", 
    tags=["Request"]   
)
# Crear request
@router.post("/", response_model=schemas.RequestResponse)
def create_request(request: schemas.RequestCreate, db: Session = Depends(get_db)):

    new_request = models.Request(**request.dict())

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return new_request


# Obtener todos
@router.get("/", response_model=list[schemas.RequestResponse])
def get_requests(db: Session = Depends(get_db)):

    requests = db.query(models.Request).all()

    return requests


# Obtener por id
@router.get("/{request_id}", response_model=schemas.RequestResponse)
def get_request(request_id: int, db: Session = Depends(get_db)):

    request = db.query(models.Request).filter(
        models.Request.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Request no encontrado")

    return request


# Actualizar
@router.put("/{request_id}", response_model=schemas.RequestResponse)
def update_request(request_id: int, request: schemas.RequestCreate, db: Session = Depends(get_db)):

    request_query = db.query(models.Request).filter(
        models.Request.request_id == request_id
    )

    request_db = request_query.first()

    if not request_db:
        raise HTTPException(status_code=404, detail="Request no encontrado")

    request_query.update(request.dict(), synchronize_session=False)
    db.commit()

    return request_query.first()


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