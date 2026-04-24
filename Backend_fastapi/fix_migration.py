import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("Corrigiendo restricciones y completando migración...")

    # 1. Quitar la restricción que apunta a 'users'
    try:
        cursor.execute("ALTER TABLE drivers DROP CONSTRAINT FK_drivers_users")
        print("Restricción FK_drivers_users eliminada.")
    except Exception as e:
        print(f"Nota: No se pudo eliminar FK_drivers_users (tal vez ya no existe): {e}")

    # 2. Asegurarse de que todos los drivers están en users_app (por si acaso falló antes a la mitad)
    cursor.execute("SELECT nombre, email, contrasena, role, idoperador, usertelefono, user_id FROM users WHERE role = 'driver'")
    drivers_to_migrate = cursor.fetchall()
    
    for d in drivers_to_migrate:
        nombre, email, contrasena, role, idop, tel, old_id = d
        # Verificar si ya existe en users_app
        cursor.execute("SELECT user_id FROM users_app WHERE user_id = ?", (old_id,))
        if not cursor.fetchone():
            cursor.execute("SET IDENTITY_INSERT users_app ON")
            cursor.execute(
                "INSERT INTO users_app (user_id, nombre, email, contrasena, role, idoperador, usertelefono) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (old_id, nombre, email, contrasena, role, idop, tel)
            )
            cursor.execute("SET IDENTITY_INSERT users_app OFF")
            print(f"Migrado faltante: {email}")

    # 3. Ahora sí, borrar de la tabla users original
    cursor.execute("DELETE FROM users WHERE role = 'driver'")
    print("Usuarios 'driver' eliminados de la tabla 'users'.")

    # 4. Crear la nueva restricción apuntando a 'users_app'
    try:
        cursor.execute("ALTER TABLE drivers ADD CONSTRAINT FK_drivers_users_app FOREIGN KEY (user_id) REFERENCES users_app(user_id)")
        print("Nueva restricción FK_drivers_users_app creada (apuntando a users_app).")
    except Exception as e:
        print(f"Error al crear nueva restricción: {e}")

    conn.commit()
    print("Proceso completado con éxito.")

except Exception as e:
    print(f"Error crítico: {e}")
finally:
    if 'conn' in locals():
        conn.close()
