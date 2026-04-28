import sys
import os

# Añadir el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User

def create_admin():
    db = SessionLocal()
    try:
        # Verificar si ya existe
        admin_exists = db.query(User).filter(User.email == "admin@transfleet.com").first()
        if admin_exists:
            print("El usuario administrador ya existe.")
            return

        # Crear el nuevo admin
        new_admin = User(
            nombre="Administrador Sistema",
            email="admin@transfleet.com",
            contrasena="admin123",
            role="admin",
            idoperador="OP-001",
            usertelefono="809-000-0000"
        )
        
        db.add(new_admin)
        db.commit()
        print("¡Usuario administrador creado con éxito!")
        print("Email: admin@transfleet.com")
        print("Password: admin123")
    except Exception as e:
        print(f"Error al crear el usuario: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
