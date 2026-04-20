from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from app.routers import drivers, users, locations, vehicles, trips, trips2, clients, driver_trips
from app import schemas, models
from sqlalchemy.orm import Session
from app.database import get_db
from datetime import datetime, timedelta
import jwt
import os

app = FastAPI(
    title="Driver Tracking API"
)

# ─── Redirige la raíz al tracking público ───────────────────
@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/app/tracking.html")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "null",                      # file:// origin en algunos navegadores
        "http://localhost",
        "http://localhost:5500",      # Live Server de VSCode
        "http://127.0.0.1",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,         # False permite wildcard correctamente
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drivers.router)
app.include_router(users.router)
app.include_router(vehicles.router)
app.include_router(locations.router)
app.include_router(trips.router)
app.include_router(trips2.router)
app.include_router(clients.router)
app.include_router(driver_trips.router)

# ─── Servir el Frontend como archivos estáticos ─────────────
# main.py está en: Backend_fastapi/app/main.py
# repo root  está en: ../.. desde app/
FRONTEND_PATH = Path(__file__).parent.parent.parent / "Front_end" / "Proyecto"
if not FRONTEND_PATH.exists():
    # Fallback: ruta absoluta directa
    FRONTEND_PATH = Path("c:/Users/emiss/Desktop/Carrrr/driver-tracking-system/Front_end/Proyecto")
app.mount("/app", StaticFiles(directory=str(FRONTEND_PATH), html=True), name="frontend")

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


# Endpoint de login en la raíz /api/login (para conexión con frontend y app móvil)
@app.post("/api/login", response_model=schemas.LoginResponse)
def api_login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Endpoint de login que autentica usuarios"""

    user = db.query(models.User).filter(models.User.email == login_data.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    if user.contrasena != login_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    driver = db.query(models.Driver).filter(models.Driver.user_id == user.user_id).first()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.user_id,
            "role": user.role,
            "driver_id": driver.driver_id if driver else None
        },
        expires_delta=access_token_expires
    )

    return {
        "token": token,
        "user": {
            "id": user.user_id,
            "email": user.email,
            "name": user.nombre,
            "role": user.role,
            "driver_id": driver.driver_id if driver else None
        }
    }