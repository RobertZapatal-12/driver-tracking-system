import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str, autocommit=True)
    cursor = conn.cursor()
    
    print("Restaurando conductores a users_app...")
    
    users_to_restore = [
        (14, 'Yarel Zapata', 'yarel@transfleet.com', '123456', 'driver', '2026-03-25 20:23:42.930', None, None),
        (17, 'Driver Test 6', 'driver6@transfleet.com', 'driver123', 'driver', '2026-04-22 21:29:15.347', None, '8090000000'),
        (18, 'Robert Yarel Zapata', 'maricon@transfleet.com', '1234', 'driver', '2026-04-22 21:49:11.287', None, '8098632010')
    ]

    cursor.execute("SET IDENTITY_INSERT users_app ON")
    for u in users_to_restore:
        try:
            cursor.execute(
                "INSERT INTO users_app (user_id, nombre, email, contrasena, role, creado_desde, idoperador, usertelefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                u
            )
            print(f"Restaurado: {u[2]}")
        except Exception as e:
            print(f"Error restaurando {u[2]}: {e}")
    cursor.execute("SET IDENTITY_INSERT users_app OFF")

    # También actualizar drivers para que apunten a estos IDs de nuevo
    print("\nVinculando conductores en tabla 'drivers'...")
    cursor.execute("UPDATE drivers SET user_id = 14 WHERE driver_id = 9") # Asumiendo Robert Yarel es ID 9 (según mi check anterior)
    # Wait, let me check driver_id vs name again from my previous log
    # [(4, 2, 'Yan Franco Caminero Polanco'), (6, None, 'Driver Test 6'), (9, 18, 'Robert Yarel Zapata')]
    # Yan Franco (ID 4) -> user_id 2 (Manager - stays NULL in users_app or I should probably not link it)
    # Driver Test 6 (ID 6) -> should be user_id 17
    # Robert Yarel Zapata (ID 9) -> should be user_id 18 (Wait, yarel@transfleet.com was 14, maricon@ was 18)
    
    cursor.execute("UPDATE drivers SET user_id = 17 WHERE driver_id = 6")
    cursor.execute("UPDATE drivers SET user_id = 18 WHERE driver_id = 9")
    
    print("Hecho.")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
