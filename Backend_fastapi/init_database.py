#!/usr/bin/env python3
"""
Script para inicializar la base de datos y crear las tablas necesarias
Uso: python init_database.py
"""

from app.database import Base, engine
from app import models

def init_db():
    """Crea todas las tablas en la base de datos"""
    print("=" * 60)
    print("TransFleet - Inicializando Base de Datos")
    print("=" * 60)
    print()
    
    try:
        print("🔄 Creando tablas en la base de datos...")
        
        # Crear todas las tablas definidas en models.py
        Base.metadata.create_all(bind=engine)
        
        print("✅ Tablas creadas exitosamente!")
        print()
        print("Tablas creadas:")
        print("  - users")
        print("  - drivers")
        print("  - locations")
        print("  - vehicles")
        print("  - routes")
        print("  - request")
        print()
        print("=" * 60)
        print("✨ Base de datos lista para usar")
        print("=" * 60)
        print()
        
    except Exception as e:
        print(f"❌ Error al crear las tablas: {str(e)}")
        print()
        print("Posibles causas:")
        print("  - No hay conexión a la base de datos")
        print("  - Las credenciales son incorrectas")
        print("  - El servidor está caído")
        print()
        raise

if __name__ == "__main__":
    init_db()
