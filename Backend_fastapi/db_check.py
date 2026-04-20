import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models import Client, Driver
from sqlalchemy.orm import Session
from sqlalchemy import text

def check_and_fix_db():
    retries = 5
    for attempt in range(retries):
        try:
            print(f"Intento {attempt+1} para arreglar DB...")
            # Create clients table
            Client.__table__.create(engine, checkfirst=True)
            print("Tabla clients creada (o ya existia).")

            with Session(engine) as session:
                drivers_count = session.query(Driver).count()
                print(f"Hay {drivers_count} conductores en la base de datos.")
            
            return # Exito!
        except Exception as e:
            print(f"Error en intento {attempt+1}: {e}")
            time.sleep(2)

if __name__ == "__main__":
    check_and_fix_db()
