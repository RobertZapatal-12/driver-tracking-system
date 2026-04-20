import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def add_columns():
    print("Iniciando la actualización de la tabla routes...")
    with engine.begin() as conn:
        for col in ["lat_origen", "lon_origen", "lat_destino", "lon_destino"]:
            try:
                conn.execute(text(f"ALTER TABLE routes ADD {col} FLOAT"))
                print(f"Columna {col} añadida exitosamente.")
            except Exception as e:
                print(f"Aviso al añadir la columna {col} (quizás ya existía): {e}")

if __name__ == "__main__":
    add_columns()
