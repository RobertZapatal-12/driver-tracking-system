from app.database import SessionLocal
from app.models import Driver, Request

db = SessionLocal()

print("Drivers:")
for d in db.query(Driver).all():
    print(f"ID: {d.driver_id}, Name: {d.nombre}")

print("\nRequests:")
for r in db.query(Request).filter(Request.estado != "completada").all():
    print(f"ReqID: {r.request_id}, DriverID: {r.driver_id}, Estado: {r.estado}, SubEstado: {r.sub_estado}")

db.close()
