"""
Migración: Asegurar columnas de vencimiento en las tablas correctas (SQL Server).
- drivers: vencimiento_licencia
- vehicles: vencimiento_seguro
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
        agregadas = []

        # LICENCIA en Drivers
        if not column_exists(cursor, "drivers", "vencimiento_licencia"):
            cursor.execute("ALTER TABLE drivers ADD vencimiento_licencia NVARCHAR(20) NULL")
            agregadas.append("drivers.vencimiento_licencia")

        # SEGURO en Vehicles
        if not column_exists(cursor, "vehicles", "vencimiento_seguro"):
            cursor.execute("ALTER TABLE vehicles ADD vencimiento_seguro NVARCHAR(20) NULL")
            agregadas.append("vehicles.vencimiento_seguro")

        conn.commit()
        conn.close()

        if agregadas:
            print(f"[OK] Columnas procesadas: {', '.join(agregadas)}")
        else:
            print("[INFO] Las columnas ya existen correctamente.")

    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    run()
