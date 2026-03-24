from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from datetime import datetime, timedelta
import jwt
import os

# Se crea un router para manejar todas las rutas relacionadas con los usuarios
router = APIRouter(
    prefix="/users", # Todas las rutas comenzarán con /users
    tags=["Users"]   # Nombre que aparecerá en la documentación automática de FastAPI
)

# Configuración JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Crea un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


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

# Endpoint para login
@router.post("/login", response_model=schemas.LoginResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Autentica un usuario y retorna un token JWT"""
    
    # Buscar el usuario por email
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    # Verificar contraseña (NOTA: En producción, usar hashing seguro como bcrypt)
    if user.contrasena != login_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    # Crear token JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    # Retornar token y datos del usuario
    return {
        "token": token,
        "user": {
            "id": user.user_id,
            "email": user.email,
            "name": user.nombre,
            "role": user.role
        }
    }

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
