import sys
sys.path.insert(0, 'c:/Users/yarel/Documents/GitHub/driver-tracking-system/Backend_fastapi')
from sqlalchemy import create_engine
from sqlalchemy.sql import text
from app.database import DATABASE_URL

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE vehicles ALTER COLUMN imagen1 VARCHAR(MAX);"))
        conn.execute(text("ALTER TABLE vehicles ALTER COLUMN imagen2 VARCHAR(MAX);"))
        conn.execute(text("ALTER TABLE vehicles ALTER COLUMN imagen3 VARCHAR(MAX);"))
        conn.execute(text("ALTER TABLE vehicles ALTER COLUMN imagen4 VARCHAR(MAX);"))
        conn.execute(text("ALTER TABLE vehicles ALTER COLUMN imagen5 VARCHAR(MAX);"))
        conn.commit()
    print("Columnas de imagen en la tabla vehicles cambiadas a VARCHAR(MAX) con éxito!")
except Exception as e:
    print(f"Error: {e}")
