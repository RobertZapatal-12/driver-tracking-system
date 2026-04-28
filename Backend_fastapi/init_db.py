import sys
import os

# Añadir el directorio actual al path para poder importar 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models import User, UserApp, Client, Driver, Location, Route, Vehicle, Request, DriverTrip

def init_db():
    print("Conectando a Supabase y creando tablas...")
    try:
        # Esto crea todas las tablas definidas en models.py
        Base.metadata.create_all(bind=engine)
        print("¡Éxito! Todas las tablas se han creado correctamente en Supabase.")
    except Exception as e:
        print(f"Error al crear las tablas: {e}")
        print("\nCONSEJO: Revisa que tu contraseña en database.py sea correcta y que no tenga caracteres especiales sin codificar.")

if __name__ == "__main__":
    init_db()
