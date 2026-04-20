import sys
import os

# Asegurar que el modulo app pueda ser importado
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models import Client

def create_clients_table():
    print("Iniciando la creación de la tabla clients...")
    try:
        Client.__table__.create(engine)
        print("¡Tabla 'clients' creada exitosamente!")
    except Exception as e:
        print("Error al crear la tabla 'clients':", e)

if __name__ == "__main__":
    create_clients_table()
