#!/usr/bin/env python3
"""
Script alternativo para crear usuarios directamente en la base de datos (sin API)
Uso: python create_users_direct.py
"""

from app.database import SessionLocal
from app import models

def create_users_direct():
    """Crea usuarios directamente en la base de datos"""
    db = SessionLocal()
    
    print("=" * 60)
    print("TransFleet - Crear Usuarios (Directo a BD)")
    print("=" * 60)
    print()
    
    users_data = [
        {
            "nombre": "Admin Usuario",
            "email": "admin@transfleet.com",
            "contrasena": "admin123",
            "role": "admin"
        },
        {
            "nombre": "Gerente Operaciones",
            "email": "gerente@transfleet.com",
            "contrasena": "gerente123",
            "role": "manager"
        },
        {
            "nombre": "Operario Sistema",
            "email": "operario@transfleet.com",
            "contrasena": "operario123",
            "role": "operator"
        }
    ]
    
    try:
        created_count = 0
        for user_data in users_data:
            try:
                # Verificar si el usuario ya existe
                existing = db.query(models.User).filter(
                    models.User.email == user_data["email"]
                ).first()
                
                if existing:
                    print(f"⚠️  Usuario ya existe: {user_data['email']}")
                    continue
                
                # Crear nuevo usuario
                new_user = models.User(**user_data)
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                
                print(f"✅ Usuario creado: {user_data['email']}")
                created_count += 1
                
            except Exception as e:
                db.rollback()
                print(f"❌ Error creando {user_data['email']}: {str(e)}")
        
        print()
        print(f"📊 Resultado: {created_count}/{len(users_data)} usuarios creados")
        print()
        
        # Listar usuarios creados
        print("👥 Usuarios en la base de datos:")
        print("-" * 60)
        all_users = db.query(models.User).all()
        for user in all_users:
            print(f"  ID: {user.user_id} | Email: {user.email} | Role: {user.role}")
        
        print()
        print("=" * 60)
        print("✨ Usuarios listos para login")
        print("=" * 60)
        print()
        
    except Exception as e:
        print(f"❌ Error en la operación: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_users_direct()
