import pyodbc

# Configuración de conexión
conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # 1. Crear la tabla users_app si no existe
    print("Verificando/Creando tabla users_app...")
    create_table_sql = """
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
    """
    cursor.execute(create_table_sql)
    print("Tabla users_app lista.")

    # 2. Migrar usuarios con rol 'driver'
    print("Migrando usuarios 'driver' de 'users' a 'users_app'...")
    
    # Seleccionamos los drivers
    cursor.execute("SELECT nombre, email, contrasena, role, idoperador, usertelefono, user_id FROM users WHERE role = 'driver'")
    drivers = cursor.fetchall()
    
    if not drivers:
        print("No se encontraron usuarios con rol 'driver' para migrar.")
    else:
        for d in drivers:
            nombre, email, contrasena, role, idop, tel, old_id = d
            
            # Insertar en users_app
            # Usamos SET IDENTITY_INSERT para intentar mantener los IDs si es posible, 
            # pero mejor dejamos que la nueva tabla asigne nuevos y actualizamos las referencias.
            # Sin embargo, Driver.user_id apunta a este ID. 
            # Para no romper relaciones, intentaremos insertar con el mismo ID.
            
            cursor.execute("SET IDENTITY_INSERT users_app ON")
            try:
                cursor.execute(
                    "INSERT INTO users_app (user_id, nombre, email, contrasena, role, idoperador, usertelefono) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (old_id, nombre, email, contrasena, role, idop, tel)
                )
                print(f"Migrado: {email} (ID: {old_id})")
            except Exception as e:
                print(f"Error migrando {email}: {e}")
            cursor.execute("SET IDENTITY_INSERT users_app OFF")

        # 3. Eliminar de la tabla users original
        cursor.execute("DELETE FROM users WHERE role = 'driver'")
        print(f"Eliminados {len(drivers)} usuarios de la tabla 'users'.")

    conn.commit()
    print("Migración completada con éxito.")

except Exception as e:
    print(f"Error durante la migración: {e}")
finally:
    if 'conn' in locals():
        conn.close()
