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

    
    return db.query(models.User).all()

# Endpoint para crear un nuevo usuario en la base de datos
@router.post("/")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):

    
    new_user = models.User(**user.dict())
    
   
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
#Endpoint para buscar por id
@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_id == user_id).first()

    if not user:
        return {"error": "Usuario no encontrado"}

    return user
#Endpoint para actualizar el user
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
#Endpoint para borrar el user
@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_id == user_id).first()

    if not user:
        return {"error": "Usuario no encontrado"}

    db.delete(user)
    db.commit()

    return {"mensaje": "Usuario eliminado correctamente"}
