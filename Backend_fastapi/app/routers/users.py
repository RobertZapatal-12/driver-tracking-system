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

@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_id == user_id).first()

    if not user:
        return {"error": "Usuario no encontrado"}

    return user

@router.put("/{user_id}")
def update_user(user_id: int, user: schemas.UserCreate, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()

    if not db_user:
        return {"error": "Usuario no encontrado"}

    for key, value in user.dict().items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_id == user_id).first()

    if not user:
        return {"error": "Usuario no encontrado"}

    db.delete(user)
    db.commit()

    return {"mensaje": "Usuario eliminado correctamente"}
