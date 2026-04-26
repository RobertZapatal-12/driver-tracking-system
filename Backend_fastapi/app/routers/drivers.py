from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Se crea un router para agrupar todas las rutas relacionadas con drivers
router = APIRouter(
    prefix="/drivers", # Todas las rutas comenzarán con /drivers
    tags=["Drivers"]   # Nombre que aparecerá en la documentación automática
)

# ─────────────────────────────────────────────────────────────────────────────
# HELPER: adjuntar email_usuario a un driver ORM object
# ─────────────────────────────────────────────────────────────────────────────
def _enrich_driver(driver: models.Driver, db: Session) -> dict:
    """Convierte un objeto Driver en dict y adjunta el email del usuario vinculado."""
    data = {
        "driver_id":            driver.driver_id,
        "user_id":              driver.user_id,
        "nombre":               driver.nombre,
        "telefono":             driver.telefono,
        "numero_licencia":      driver.numero_licencia,
        "cedula":               driver.cedula,
        "tipo_licencia":        driver.tipo_licencia,
        "vencimiento_licencia": driver.vencimiento_licencia,
        "estado":               driver.estado,
        "imagen":               driver.imagen,
        "descripcion":          driver.descripcion,
        "email_usuario":        None,
    }
    if driver.user_id:
        user = db.query(models.UserApp).filter(models.UserApp.user_id == driver.user_id).first()
        if user:
            data["email_usuario"] = user.email
    return data


# ─────────────────────────────────────────────────────────────────────────────
# GET /drivers/ — Todos los conductores
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/")
def get_drivers(db: Session = Depends(get_db)):
    drivers = db.query(models.Driver).all()
    user_ids = {d.user_id for d in drivers if d.user_id}
    users = {u.user_id: u.email for u in db.query(models.UserApp).filter(models.UserApp.user_id.in_(user_ids)).all()} if user_ids else {}
    
    result = []
    for driver in drivers:
        data = {
            "driver_id":            driver.driver_id,
            "user_id":              driver.user_id,
            "nombre":               driver.nombre,
            "telefono":             driver.telefono,
            "numero_licencia":      driver.numero_licencia,
            "cedula":               driver.cedula,
            "tipo_licencia":        driver.tipo_licencia,
            "vencimiento_licencia": driver.vencimiento_licencia,
            "estado":               driver.estado,
            "imagen":               driver.imagen,
            "descripcion":          driver.descripcion,
            "email_usuario":        users.get(driver.user_id) if driver.user_id else None,
        }
        result.append(data)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /drivers/stats/activos — Estadísticas de choferes para el dashboard
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/stats/activos")
def get_stats_activos(db: Session = Depends(get_db)):
    """Devuelve el total de conductores activos e inactivos."""
    total = db.query(models.Driver).count()
    activos = db.query(models.Driver).filter(
        models.Driver.estado == "Activo"
    ).count()
    return {
        "activos": activos,
        "total": total,
        "inactivos": total - activos,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /drivers/{driver_id} — Conductor específico
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{driver_id}")
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    return _enrich_driver(driver, db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /drivers/ — Crear conductor
# Si se proveen email + password, se crea automáticamente un User(role='driver')
# y se vincula al conductor. Solo el admin puede hacer esto desde el frontend.
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/")
def create_driver(driver: schemas.DriverCreate, db: Session = Depends(get_db)):
    email    = driver.email
    password = driver.password

    # Extraer solo los campos del modelo Driver (sin email/password)
    driver_data = driver.dict(exclude={"email", "password"})

    new_driver = models.Driver(**driver_data)

    # Si se proveen credenciales, crear usuario de acceso para la app
    if email and password:
        # Verificar que el email no esté ya en uso (en users_app)
        existing_user = db.query(models.UserApp).filter(models.UserApp.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail=f"El correo '{email}' ya está registrado en el sistema de la app"
            )

        new_user = models.UserApp(
            nombre      = driver_data["nombre"],
            email       = email,
            contrasena  = password,
            role        = "driver",
            idoperador  = "",
            usertelefono= driver_data.get("telefono", ""),
        )
        db.add(new_user)
        db.flush()  # Obtener new_user.user_id sin hacer commit aún
        new_driver.user_id = new_user.user_id

    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)

    return _enrich_driver(new_driver, db)


# ─────────────────────────────────────────────────────────────────────────────
# PUT /drivers/{driver_id} — Actualizar conductor
# Si se proveen email + password, se actualiza o crea el usuario vinculado.
# ─────────────────────────────────────────────────────────────────────────────
@router.put("/{driver_id}")
def update_driver(driver_id: int, driver: schemas.DriverCreate, db: Session = Depends(get_db)):
    db_driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()

    if not db_driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    email    = driver.email
    password = driver.password

    # Actualizar campos del driver (sin email/password)
    driver_data = driver.dict(exclude={"email", "password"})
    for key, value in driver_data.items():
        setattr(db_driver, key, value)

    # Gestionar usuario vinculado
    if email:
        if db_driver.user_id:
            # Ya tiene usuario — actualizarlo
            linked_user = db.query(models.UserApp).filter(models.UserApp.user_id == db_driver.user_id).first()
            if linked_user:
                # Verificar email único (ignorar si es el mismo usuario)
                conflict = db.query(models.UserApp).filter(
                    models.UserApp.email == email,
                    models.UserApp.user_id != db_driver.user_id
                ).first()
                if conflict:
                    raise HTTPException(
                        status_code=400,
                        detail=f"El correo '{email}' ya está en uso por otro conductor"
                    )
                linked_user.email  = email
                linked_user.nombre = driver_data["nombre"]
                linked_user.usertelefono = driver_data.get("telefono", linked_user.usertelefono)
                if password:
                    linked_user.contrasena = password
        else:
            # No tiene usuario — crear uno nuevo en users_app
            existing_user = db.query(models.UserApp).filter(models.UserApp.email == email).first()
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail=f"El correo '{email}' ya está registrado en el sistema de la app"
                )
            new_user = models.UserApp(
                nombre      = driver_data["nombre"],
                email       = email,
                contrasena  = password or "cambiar123",
                role        = "driver",
                idoperador  = "",
                usertelefono= driver_data.get("telefono", ""),
            )
            db.add(new_user)
            db.flush()
            db_driver.user_id = new_user.user_id

    db.commit()
    db.refresh(db_driver)

    return _enrich_driver(db_driver, db)


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /drivers/{driver_id}/estado — Marcar Activo / Inactivo (app móvil)
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/{driver_id}/estado")
def update_driver_estado(driver_id: int, body: dict, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    nuevo_estado = body.get("estado")
    if not nuevo_estado:
        raise HTTPException(status_code=400, detail="Campo 'estado' requerido")
    driver.estado = nuevo_estado
    db.commit()
    db.refresh(driver)
    return {"driver_id": driver_id, "estado": driver.estado}


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /drivers/{driver_id}/vincular-usuario — Vincular user_id manualmente
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/{driver_id}/vincular-usuario")
def vincular_usuario(driver_id: int, body: dict, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    user_id = body.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Campo 'user_id' requerido")
    user = db.query(models.UserApp).filter(models.UserApp.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario de app no encontrado")
    driver.user_id = user_id
    db.commit()
    db.refresh(driver)
    return {"driver_id": driver_id, "user_id": driver.user_id, "nombre": driver.nombre}


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /drivers/{driver_id} — Eliminar conductor
# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()

    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    # Borrar datos relacionados primero
    db.query(models.Location).filter(models.Location.driver_id == driver_id).delete()
    db.query(models.Vehicle).filter(models.Vehicle.driver_id == driver_id).delete()

    # Borrar el conductor (el usuario vinculado se conserva por seguridad)
    db.delete(driver)
    db.commit()

    return {"mensaje": "Conductor eliminado"}