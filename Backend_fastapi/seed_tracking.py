from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Location, Driver

DATABASE_URL = "mssql+pyodbc://wascar23_SQLLogin_1:jcsinnz5sy@transfleet.mssql.somee.com/transfleet?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # 1. Asegurarnos de que el conductor 4 tenga una ubicación
    # Primero limpiar ubicaciones viejas para este conductor si queremos frescura
    db.query(Location).filter(Location.driver_id == 4).delete()
    loc1 = Location(driver_id=4, latitud=18.4861, longitud=-69.9312, velocidad=45.0)
    db.add(loc1)
    
    # 2. Conductor 6
    d6 = db.query(Driver).filter(Driver.driver_id == 6).first()
    if not d6:
        print("Creating Driver 6...")
        new_d6 = Driver(driver_id=6, nombre="Driver Test 6", telefono="8090000000", estado="Activo")
        db.add(new_d6)
        db.flush()
    
    db.query(Location).filter(Location.driver_id == 6).delete()
    loc6 = Location(driver_id=6, latitud=18.4750, longitud=-69.9200, velocidad=35.0)
    db.add(loc6)
    
    db.commit()
    print("Dummy tracking data inserted successfully.")

except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
