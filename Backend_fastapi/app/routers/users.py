from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para manejar todas las rutas relacionadas con los usuarios
router = APIRouter(
    prefix="/users", # Todas las rutas comenzarán con /users
    tags=["Users"]   # Nombre que aparecerá en la documentación automática de FastAPI
)

# Endpoint para obtener todos los usuarios registrados en la base de datos
@router.get("/")
def get_users(db: Session = Depends(get_db)):

    # Realiza una consulta a la tabla User y devuelve todos los registr
    return db.query(models.User).all()

# Endpoint para crear un nuevo usuario en la base de datos
@router.post("/")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):

    # Convierte los datos recibidos del schema UserCreate en un objeto del modelo User
    new_user = models.User(**user.dict())
    
    # Agrega el nuevo usuario a la sesión de la base de datos
    db.add(new_user)

    # Guarda los cambios en la base de datos
    db.commit()

    # Actualiza el objeto con los datos generados por la base de datos (por ejemplo el ID)
    db.refresh(new_user)

    # Devuelve el usuario recién creado
    return new_user