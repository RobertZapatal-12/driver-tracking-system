from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Location, Driver

DATABASE_URL = "mssql+pyodbc://wascar23_SQLLogin_1:jcsinnz5sy@transfleet.mssql.somee.com/transfleet?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    locations = db.query(Location).all()
    print(f"Total locations: {len(locations)}")
    for loc in locations:
        print(f"Location ID: {loc.location_id}, Driver ID: {loc.driver_id}, Lat: {loc.latitud}, Lon: {loc.longitud}")
    
    drivers = db.query(Driver).all()
    print(f"Total drivers: {len(drivers)}")
    for d in drivers:
        print(f"Driver ID: {d.driver_id}, Name: {d.nombre}")

finally:
    db.close()
