from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database import engine, Base, SessionLocal
from app.models import Chofer, Servicio

app = FastAPI()

# Crear tablas automáticamente
Base.metadata.create_all(bind=engine)


# Dependencia de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ruta base
@app.get("/")
def root():
    return {"mensaje": "Backend funcionando"}


# -----------------------------
# CHOFERES
# -----------------------------

@app.post("/choferes")
def crear_chofer(
    nombre: str,
    licencia: str,
    telefono: str,
    categoria: str,
    db: Session = Depends(get_db)
):

    nuevo_chofer = Chofer(
        nombre=nombre,
        licencia=licencia,
        telefono=telefono,
        categoria=categoria,
        lat=0,
        lng=0
    )

    db.add(nuevo_chofer)
    db.commit()
    db.refresh(nuevo_chofer)

    return nuevo_chofer


@app.get("/choferes")
def listar_choferes(db: Session = Depends(get_db)):
    return db.query(Chofer).all()


@app.delete("/choferes/{chofer_id}")
def eliminar_chofer(chofer_id: int, db: Session = Depends(get_db)):

    chofer = db.query(Chofer).filter(Chofer.id == chofer_id).first()

    if not chofer:
        return {"error": "Chofer no encontrado"}

    db.delete(chofer)
    db.commit()

    return {"mensaje": f"Chofer con id {chofer_id} eliminado"}


@app.put("/choferes/{chofer_id}/ubicacion")
def actualizar_ubicacion(
    chofer_id: int,
    lat: float,
    lng: float,
    db: Session = Depends(get_db)
):

    chofer = db.query(Chofer).filter(Chofer.id == chofer_id).first()

    if not chofer:
        return {"error": "Chofer no encontrado"}

    chofer.lat = lat
    chofer.lng = lng

    db.commit()

    return {"mensaje": "Ubicación actualizada"}


@app.get("/choferes/{chofer_id}/servicios")
def historial_servicios(chofer_id: int, db: Session = Depends(get_db)):

    servicios = db.query(Servicio).filter(
        Servicio.chofer_id == chofer_id
    ).all()

    return servicios


# -----------------------------
# SERVICIOS
# -----------------------------

@app.post("/servicios")
def crear_servicio(
    cliente: str,
    origen: str,
    destino: str,
    categoria: str,
    fecha: str,
    hora: str,
    chofer_id: int,
    db: Session = Depends(get_db)
):

    chofer = db.query(Chofer).filter(Chofer.id == chofer_id).first()

    if not chofer:
        return {"error": "Chofer no encontrado"}

    # validar que el chofer no tenga otro servicio en la misma hora
    servicio_existente = db.query(Servicio).filter(
        Servicio.chofer_id == chofer_id,
        Servicio.fecha == fecha,
        Servicio.hora == hora,
        Servicio.estado != "completado"
    ).first()

    if servicio_existente:
        return {"error": "El chofer ya tiene un servicio en esa fecha y hora"}

    nuevo_servicio = Servicio(
        cliente=cliente,
        origen=origen,
        destino=destino,
        categoria=categoria,
        fecha=fecha,
        hora=hora,
        chofer_id=chofer_id
    )

    db.add(nuevo_servicio)
    db.commit()
    db.refresh(nuevo_servicio)

    return nuevo_servicio


@app.get("/servicios")
def listar_servicios(db: Session = Depends(get_db)):
    return db.query(Servicio).all()


@app.get("/servicios/detalle")
def listar_servicios_detalle(db: Session = Depends(get_db)):

    servicios = db.query(Servicio).all()

    resultado = []

    for s in servicios:

        chofer = None

        if s.chofer_id:
            chofer = db.query(Chofer).filter(Chofer.id == s.chofer_id).first()

        resultado.append({
            "servicio_id": s.id,
            "cliente": s.cliente,
            "origen": s.origen,
            "destino": s.destino,
            "categoria": s.categoria,
            "fecha": s.fecha,
            "hora": s.hora,
            "estado": s.estado,
            "chofer": chofer.nombre if chofer else None
        })

    return resultado


@app.get("/servicios/fecha/{fecha}")
def servicios_por_fecha(fecha: str, db: Session = Depends(get_db)):

    servicios = db.query(Servicio).filter(
        Servicio.fecha == fecha
    ).order_by(Servicio.hora).all()

    return servicios


@app.delete("/servicios/{servicio_id}")
def eliminar_servicio(servicio_id: int, db: Session = Depends(get_db)):

    servicio = db.query(Servicio).filter(
        Servicio.id == servicio_id
    ).first()

    if not servicio:
        return {"error": "Servicio no encontrado"}

    db.delete(servicio)
    db.commit()

    return {"mensaje": f"Servicio {servicio_id} eliminado"}


@app.post("/servicios/{servicio_id}/asignar")
def asignar_chofer(servicio_id: int, db: Session = Depends(get_db)):

    servicio = db.query(Servicio).filter(
        Servicio.id == servicio_id
    ).first()

    if not servicio:
        return {"error": "Servicio no encontrado"}

    chofer = db.query(Chofer).filter(
        Chofer.disponible == True,
        Chofer.categoria == servicio.categoria
    ).first()

    if not chofer:
        return {"mensaje": "No hay chofer disponible"}

    servicio.chofer_id = chofer.id
    servicio.estado = "asignado"

    chofer.disponible = False
    chofer.servicios_hoy += 1

    db.commit()

    return {
        "mensaje": "Chofer asignado",
        "chofer_id": chofer.id,
        "nombre": chofer.nombre
    }


@app.put("/servicios/{servicio_id}/iniciar")
def iniciar_servicio(servicio_id: int, db: Session = Depends(get_db)):

    servicio = db.query(Servicio).filter(
        Servicio.id == servicio_id
    ).first()

    if not servicio:
        return {"error": "Servicio no encontrado"}

    servicio.estado = "en_curso"

    db.commit()

    return {
        "mensaje": "Servicio iniciado",
        "servicio_id": servicio.id
    }


@app.put("/servicios/{servicio_id}/finalizar")
def finalizar_servicio(servicio_id: int, db: Session = Depends(get_db)):

    servicio = db.query(Servicio).filter(
        Servicio.id == servicio_id
    ).first()

    if not servicio:
        return {"error": "Servicio no encontrado"}

    chofer = db.query(Chofer).filter(
        Chofer.id == servicio.chofer_id
    ).first()

    servicio.estado = "completado"

    if chofer:
        chofer.disponible = True

    db.commit()

    return {
        "mensaje": "Servicio finalizado",
        "servicio_id": servicio.id
    }

@app.get("/agenda/hoy")
def agenda_hoy(db: Session = Depends(get_db)):

    hoy = str(date.today())

    servicios = db.query(Servicio).filter(
        Servicio.fecha == hoy
    ).order_by(Servicio.hora).all()

    agenda = []

    for s in servicios:

        chofer_nombre = None

        if s.chofer_id:
            chofer = db.query(Chofer).filter(
                Chofer.id == s.chofer_id
            ).first()

            if chofer:
                chofer_nombre = chofer.nombre

        agenda.append({
            "hora": s.hora,
            "cliente": s.cliente,
            "origen": s.origen,
            "destino": s.destino,
            "estado": s.estado,
            "chofer": chofer_nombre
        })


    return agenda

#REVISION

#El principal problema es "Base.metadata.create_all(bind=engine)", hace que SQLAlchemy cree las tablas según los modelos.
#lo mejor es borrarlo, tambien revisa el nombre de las tablas en modelos(Tambien te deje una revision en models.py)
#Tambien revisar el nombre de las columnas y tablas en squema.py, asi la conexion entra correctamente.
#Revisar tambien el tipo de dato.
#Revisa tambien la conexion a la base de datos. Se llama (driver-tracking-system).







