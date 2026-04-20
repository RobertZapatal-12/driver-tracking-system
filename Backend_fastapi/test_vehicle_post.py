import urllib.request
import json
import urllib.error

data = {
    "marca": "Toyota",
    "modelo": "Corolla",
    "tipo_vehiculo": "Sedan",
    "capacidad": "4",
    "plate_number": "YYY888",
    "estado": "Disponible",
    "driver_id": None,
    "imagen1": "data:image/png;base64," + ("A" * 150000), # 150KB size base64
    "imagen2": None,
    "imagen3": None,
    "imagen4": None,
    "imagen5": None
}

try:
    req = urllib.request.Request("http://127.0.0.1:8000/vehicles/", data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as response:
        print("Status POST:", response.status)
        print("Response POST:", response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error POST:", e.code)
    print("Response POST:", e.read().decode())
