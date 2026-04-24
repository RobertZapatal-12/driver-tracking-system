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
        # Coordenadas de Megacentro y Agora Mall
        r.lat_origen = 18.5028
        r.lon_origen = -69.8596
        r.lat_destino = 18.4839
        r.lon_destino = -69.9397
        db.commit()
        print("Coordinates updated for Request 6.")
    else:
        print("Request not found.")
finally:
    db.close()
