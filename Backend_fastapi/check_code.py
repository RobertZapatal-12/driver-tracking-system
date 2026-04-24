from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Request

DATABASE_URL = "mssql+pyodbc://wascar23_SQLLogin_1:jcsinnz5sy@transfleet.mssql.somee.com/transfleet?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    r = db.query(Request).filter(Request.tracking_code == "886BA45F").first()
    if r:
        print(f"Request ID: {r.request_id}")
        print(f"Tracking Code: {r.tracking_code}")
        print(f"Origen: {r.origen}, Lat: {r.lat_origen}, Lon: {r.lon_origen}")
        print(f"Destino: {r.destino}, Lat: {r.lat_destino}, Lon: {r.lon_destino}")
        print(f"Driver ID: {r.driver_id}")
    else:
        print("Request not found.")
finally:
    db.close()
