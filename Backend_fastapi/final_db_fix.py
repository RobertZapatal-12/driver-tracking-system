import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str, autocommit=True)
    cursor = conn.cursor()
    
    print("1. Eliminando restricción FK vieja (FK_drivers_users)...")
    try:
        cursor.execute("ALTER TABLE drivers DROP CONSTRAINT FK_drivers_users")
        print("Hecho.")
    except Exception as e:
        print(f"Ya no existía o error: {e}")

    print("\n2. Eliminando conductores de la tabla 'users'...")
    cursor.execute("DELETE FROM users WHERE role = 'driver'")
    print(f"Filas eliminadas: {cursor.rowcount}")

    print("\n3. Verificando que 'users_app' tenga los datos...")
    cursor.execute("SELECT COUNT(*) FROM users_app")
    count = cursor.fetchone()[0]
    print(f"Usuarios en users_app: {count}")

    print("\n4. Intentando crear la nueva FK (FK_drivers_users_app)...")
    try:
        # Primero limpiamos cualquier user_id en drivers que no esté en users_app para evitar conflictos
        cursor.execute("UPDATE drivers SET user_id = NULL WHERE user_id NOT IN (SELECT user_id FROM users_app)")
        print("IDs huérfanos en 'drivers' limpiados (set to NULL).")
        
        cursor.execute("ALTER TABLE drivers ADD CONSTRAINT FK_drivers_users_app FOREIGN KEY (user_id) REFERENCES users_app(user_id)")
        print("Nueva FK creada exitosamente.")
    except Exception as e:
        print(f"Error al crear nueva FK: {e}")

    print("\n=== PROCESO FINALIZADO ===")

except Exception as e:
    print(f"Error crítico: {e}")
finally:
    if 'conn' in locals():
        conn.close()
