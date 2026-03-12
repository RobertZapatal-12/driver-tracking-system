from sqlalchemy import Column, Integer, String, Boolean
from .database import Base

class Driver(Base):
    __tablename__ = "drivers"

    driver_id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    telefono = Column(String)
    numero_licencia = Column(String)
    estado = Column(Boolean)