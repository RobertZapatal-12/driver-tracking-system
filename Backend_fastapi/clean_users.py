import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str, autocommit=True)
    cursor = conn.cursor()
    
    # 1. Limpiar usuarios con rol 'driver' de la tabla 'users'
    print("Ejecutando DELETE...")
    cursor.execute("DELETE FROM users WHERE role = 'driver'")
    print(f"Filas eliminadas: {cursor.rowcount}")

    # 2. Verificar contenido final
    cursor.execute("SELECT email, role FROM users")
    rows = cursor.fetchall()
    print("\nContenido actual de 'users':")
    for r in rows:
        print(r)

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
