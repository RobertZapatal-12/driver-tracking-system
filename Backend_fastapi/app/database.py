import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Configuración para Supabase (Contraseña codificada para evitar errores con símbolos)
DATABASE_URL = "postgresql://postgres.wcfgmzcyjzcxqbsiagok:Tr3pl3j01612%28%40%2913@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Para PostgreSQL no necesitamos el driver ODBC de SQL Server
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
