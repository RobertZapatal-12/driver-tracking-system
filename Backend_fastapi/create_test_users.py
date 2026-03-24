#!/usr/bin/env python3
"""
Script para crear usuarios de prueba en la base de datos de TransFleet
Uso: python create_test_users.py
"""

import requests
import json
import sys
from typing import Dict, List

API_BASE = "http://127.0.0.1:8000"

# Usuarios de prueba a crear
TEST_USERS = [
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


def create_user(user_data: Dict) -> bool:
    """Crea un usuario en la base de datos"""
    try:
        response = requests.post(
            f"{API_BASE}/users/",
            json=user_data,
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"✅ Usuario creado: {user_data['email']}")
            return True
        else:
            print(f"❌ Error al crear {user_data['email']}: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se puede conectar al servidor")
        print(f"   Verifica que el backend esté corriendo en {API_BASE}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_login(email: str, password: str) -> bool:
    """Prueba el login de un usuario"""
    try:
        response = requests.post(
            f"{API_BASE}/api/login",
            json={"email": email, "password": password},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login exitoso: {email}")
            print(f"   Token: {data['token'][:20]}...")
            print(f"   Usuario: {data['user']['name']}")
            return True
        else:
            print(f"❌ Login fallido: {response.json().get('detail', 'Error desconocido')}")
            return False
            
    except Exception as e:
        print(f"❌ Error en login: {str(e)}")
        return False


def main():
    """Función principal"""
    print("=" * 60)
    print("TransFleet - Script de Creación de Usuarios de Prueba")
    print("=" * 60)
    print()
    
    # Verificar conexión
    try:
        response = requests.get(f"{API_BASE}/users/", timeout=5)
        print(f"✅ Conexión al servidor: {API_BASE}")
        print()
    except:
        print(f"❌ No se puede conectar a {API_BASE}")
        print("   Asegúrate de que el backend esté corriendo:")
        print("   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000")
        sys.exit(1)
    
    # Crear usuarios
    print("👤 Creando usuarios de prueba...")
    print("-" * 60)
    
    created_count = 0
    for user in TEST_USERS:
        if create_user(user):
            created_count += 1
    
    print()
    print(f"📊 Resultado: {created_count}/{len(TEST_USERS)} usuarios creados")
    print()
    
    # Probar login
    if created_count > 0:
        print("🔐 Probando login...")
        print("-" * 60)
        
        login_count = 0
        for user in TEST_USERS:
            if test_login(user["email"], user["contrasena"]):
                login_count += 1
        
        print()
        print(f"📊 Resultado: {login_count}/{len(TEST_USERS)} logins exitosos")
    
    print()
    print("=" * 60)
    print("✨ Datos de Prueba Listos")
    print("=" * 60)
    print()
    print("Puedes probar el login en:")
    print(f"  🌐 {API_BASE}/login.html")
    print()
    print("Usuarios disponibles:")
    for user in TEST_USERS:
        print(f"  📧 {user['email']}")
        print(f"     🔐 {user['contrasena']}")
    print()


if __name__ == "__main__":
    main()
