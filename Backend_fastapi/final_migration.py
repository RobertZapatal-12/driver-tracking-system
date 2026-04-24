import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("Iniciando migración robusta...")

    # 1. Crear la tabla users_app si no existe
    print("Creando tabla users_app...")
    cursor.execute("""
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users_app' and xtype='U')
    CREATE TABLE users_app (
        user_id INT PRIMARY KEY IDENTITY(1,1),
        nombre VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        contrasena VARCHAR(255),
        role VARCHAR(50),
        idoperador VARCHAR(50),
        usertelefono VARCHAR(50)
    )
    """)

    # 2. Quitar la restricción que apunta a 'users' para poder borrar
    print("Quitando restricción FK_drivers_users...")
    try:
        cursor.execute("ALTER TABLE drivers DROP CONSTRAINT FK_drivers_users")
    except Exception as e:
        print(f"Aviso: FK_drivers_users no se pudo borrar (probablemente ya no existe): {e}")

    # 3. Migrar datos
    print("Migrando datos de 'users' a 'users_app'...")
    cursor.execute("SELECT nombre, email, contrasena, role, idoperador, usertelefono, user_id FROM users WHERE role = 'driver'")
    drivers = cursor.fetchall()
    
    for d in drivers:
        nombre, email, contrasena, role, idop, tel, old_id = d
        cursor.execute("SET IDENTITY_INSERT users_app ON")
        try:
            cursor.execute(
                "INSERT INTO users_app (user_id, nombre, email, contrasena, role, idoperador, usertelefono) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (old_id, nombre, email, contrasena, role, idop, tel)
            )
            print(f"Migrado: {email}")
        except Exception as e:
            print(f"Error migrando {email} (posiblemente ya existe): {e}")
        cursor.execute("SET IDENTITY_INSERT users_app OFF")

    # 4. Borrar de users
    print("Eliminando drivers de tabla 'users'...")
    cursor.execute("DELETE FROM users WHERE role = 'driver'")

    # 5. Crear la nueva restricción apuntando a 'users_app'
    print("Creando nueva restricción FK_drivers_users_app...")
    try:
        cursor.execute("ALTER TABLE drivers ADD CONSTRAINT FK_drivers_users_app FOREIGN KEY (user_id) REFERENCES users_app(user_id)")
    except Exception as e:
        print(f"Error creando FK: {e}")

    conn.commit()
    print("MIGRACIÓN FINALIZADA CON ÉXITO.")

except Exception as e:
    print(f"ERROR EN MIGRACIÓN: {e}")
finally:
    if 'conn' in locals():
        conn.close()
