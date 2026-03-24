from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para agrupar todas las rutas relacionadas con clients
router = APIRouter(
    prefix="/clients", # Todas las rutas comenzarán con /clients
    tags=["Clients"] # Nombre que aparecerá en la documentación automática
)

# Endpoint para obtener todos los clientes de la base de datos
@router.get("/")
def get_clients(db: Session = Depends(get_db)):
    # Consulta todos los registros de la tabla clients
    return db.query(models.Client).all()

# Endpoint para obtener un cliente específico usando su ID
@router.get("/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db)):
    # Filtra la tabla clients buscando el cliente con el ID indicado
    # first() devuelve el primer resultado encontrado
    return db.query(models.Client).filter(models.Client.client_id == client_id).first()

# Endpoint para crear un nuevo cliente en la base de datos
@router.post("/")
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    
    new_client = models.Client(**client.dict())

    
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    
   
    return new_client

#Endpoint para actualizar un cliente
@router.put("/{client_id}")
def update_client(client_id: int, client: schemas.ClientCreate, db: Session = Depends(get_db)):

    db_client = db.query(models.Client).filter(models.Client.client_id == client_id).first()

    if not db_client:
        return {"error": "Cliente no encontrado"}

    for key, value in client.dict().items():
        setattr(db_client, key, value)

    db.commit()
    db.refresh(db_client)

    return db_client

#Endpoint para borrar un cliente
@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):

    # Buscar el cliente
    client = db.query(models.Client).filter(models.Client.client_id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Borrar el cliente
    db.delete(client)
    db.commit()

    return {"mensaje": "Cliente eliminado"}