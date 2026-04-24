from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Request

DATABASE_URL = "mssql+pyodbc://wascar23_SQLLogin_1:jcsinnz5sy@transfleet.mssql.somee.com/transfleet?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    reqs = db.query(Request).all()
    print(f"Total requests: {len(reqs)}")
    for r in reqs:
        print(f"Request ID: {r.request_id}, Driver ID assigned: {r.driver_id}, State: {r.estado}")

finally:
    db.close()
