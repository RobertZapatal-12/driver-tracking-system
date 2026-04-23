"""
Migración: Agregar columna 'costo' a la tabla 'request' (SQL Server).
"""
import pyodbc

CONN_STR = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=transfleet.mssql.somee.com;"
    "DATABASE=transfleet;"
    "UID=wascar23_SQLLogin_1;"
    "PWD=jcsinnz5sy;"
    "TrustServerCertificate=yes;"
)

def column_exists(cursor, table, column):
    cursor.execute(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_NAME=? AND COLUMN_NAME=?",
        (table, column)
    )
    return cursor.fetchone()[0] > 0

def run():
    try:
        conn = pyodbc.connect(CONN_STR, timeout=15)
        cursor = conn.cursor()
        
        if not column_exists(cursor, "request", "costo"):
            print("[INFO] Agregando columna 'costo' a la tabla 'request'...")
            cursor.execute("ALTER TABLE request ADD costo FLOAT DEFAULT 0.0")
            # Actualizar registros existentes si es necesario (aunque el DEFAULT ya lo hace)
            cursor.execute("UPDATE request SET costo = 0.0 WHERE costo IS NULL")
            conn.commit()
            print("[OK] Columna 'costo' agregada exitosamente.")
        else:
            print("[INFO] La columna 'costo' ya existe en la tabla 'request'.")

        conn.close()
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    run()
