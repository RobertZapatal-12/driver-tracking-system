import urllib.request
import json

# Fetch vehicles to get a valid ID
req = urllib.request.Request("http://127.0.0.1:8000/vehicles/", headers={'Content-Type': 'application/json'})
vehicles = []
try:
    with urllib.request.urlopen(req) as response:
        vehicles = json.loads(response.read().decode())
except Exception as e:
    print("Could not fetch vehicles", e)

if vehicles:
    vid = vehicles[0]['vehicle_id']
    driver_id = vehicles[0].get('driver_id')
    print(f"Testing PUT on vehicle {vid} with driver {driver_id}")
    
    # 5MB massive string
    large_base64 = "data:image/png;base64," + ("A" * 50000)
    
    data = vehicles[0].copy()
    data['imagen1'] = large_base64
    if data['driver_id'] is None:
        data['driver_id'] = 0 # To test the 0 vs null issue, wait, no let's use the DB's current valid driver ID
    
    req2 = urllib.request.Request(f"http://127.0.0.1:8000/vehicles/{vid}", data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='PUT')
    try:
        with urllib.request.urlopen(req2) as response:
            print("Status PUT:", response.status)
            print("Response PUT:", response.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP Error PUT:", e.code)
        print("Response PUT:", e.read().decode())
else:
    print("No vehicles found.")
