from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from app.database import Base


class Chofer(Base):
    __tablename__ = "choferes"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String, index=True)
    licencia = Column(String)
    telefono = Column(String)

    categoria = Column(String, index=True)

    lat = Column(Float, default=0)
    lng = Column(Float, default=0)

    disponible = Column(Boolean, default=True)

    servicios_hoy = Column(Integer, default=0)


class Servicio(Base):
    __tablename__ = "servicios"

    id = Column(Integer, primary_key=True, index=True)

    cliente = Column(String, index=True)

    origen = Column(String)
    destino = Column(String)

    categoria = Column(String, index=True)

    fecha = Column(String, index=True)
    hora = Column(String, index=True)

    estado = Column(String, default="pendiente", index=True)

    chofer_id = Column(Integer, ForeignKey("choferes.id"), nullable=True)

#REVISION

#En la base de datos (driver-tracking-system) hay 6 tablas: users, drivers, vehicle, locations, solicitud y driver_last_location.
#Por ende tendrias que cambiar la parte donde dice __tablename__ = "", y poner el nombre real de las tablas que hay en el schema.sql.
#Revisa el tipo de dato, y las relaciones.
