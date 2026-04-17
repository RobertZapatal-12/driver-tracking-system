import sys
import os

# Asegurar que el modulo app pueda ser importado
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models import Request

def recreate_request_table():
    print("Iniciando la actualización de la tabla Request...")
    try:
        print("Eliminando la tabla anterior (esto borrará los datos existentes en 'request')...")
        Request.__table__.drop(engine)
        print("Tabla eliminada correctamente.")
    except Exception as e:
        print("Aviso al eliminar la tabla (quizás no existía o está bloqueada):", e)
        
    try:
        print("Creando la nueva tabla Request con la estructura actualizada...")
        Request.__table__.create(engine)
        print("¡Tabla creada exitosamente! El error debería estar solucionado.")
    except Exception as e:
        print("Error al crear la tabla:", e)

if __name__ == "__main__":
    recreate_request_table()
