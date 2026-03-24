import requests

API_BASE = "http://127.0.0.1:8000"

# Datos de prueba para clientes
clientes_prueba = [
    {
        "nombre": "Juan Pérez",
        "email": "juan.perez@example.com",
        "telefono": "809-555-0001",
        "cedula": "402-1234567-1",
        "direccion": "Calle Principal #123, Santo Domingo",
        "estado": "Activo"
    },
    {
        "nombre": "María García",
        "email": "maria.garcia@example.com",
        "telefono": "809-555-0002",
        "cedula": "402-1234567-2",
        "direccion": "Avenida Independencia #456, Santiago",
        "estado": "Activo"
    },
    {
        "nombre": "Carlos Rodríguez",
        "email": "carlos.rodriguez@example.com",
        "telefono": "809-555-0003",
        "cedula": "402-1234567-3",
        "direccion": "Calle 27 de Febrero #789, Santo Domingo",
        "estado": "Inactivo"
    }
]

def crear_clientes():
    for cliente in clientes_prueba:
        try:
            response = requests.post(f"{API_BASE}/clients/", json=cliente)
            if response.status_code == 200:
                print(f"✅ Cliente {cliente['nombre']} creado exitosamente")
            else:
                print(f"❌ Error al crear cliente {cliente['nombre']}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error de conexión: {e}")

if __name__ == "__main__":
    crear_clientes()