import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "mssql+pyodbc://wascar23_SQLLogin_1:jcsinnz5sy@transfleet.mssql.somee.com/transfleet?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
