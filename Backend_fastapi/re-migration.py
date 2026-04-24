import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

def run_migration():
    try:
        conn = pyodbc.connect(conn_str, autocommit=True) # Autocommit para DDL
        cursor = conn.cursor()
        
        print("1. Creando tabla users_app con esquema exacto...")
        # Eliminamos si existe (limpieza)
        cursor.execute("IF EXISTS (SELECT * FROM sysobjects WHERE name='users_app' and xtype='U') DROP TABLE users_app")
        
        create_sql = """
        CREATE TABLE dbo.users_app (
            user_id INT PRIMARY KEY IDENTITY(1,1),
            nombre NVARCHAR(100) NOT NULL,
            email NVARCHAR(150) NOT NULL UNIQUE,
            contrasena NVARCHAR(255) NOT NULL,
            role NVARCHAR(50) NULL,
            creado_desde DATETIME NULL DEFAULT GETDATE(),
            idoperador NVARCHAR(10) NULL,
            usertelefono NVARCHAR(15) NULL
        )
        """
        cursor.execute(create_sql)
        print("Tabla users_app creada.")

        # Ahora pasamos a modo transacción para los datos
        conn.autocommit = False
        
        print("\n2. Migrando datos de 'users' a 'users_app'...")
        cursor.execute("SELECT nombre, email, contrasena, role, creado_desde, idoperador, usertelefono, user_id FROM users WHERE role = 'driver'")
        drivers = cursor.fetchall()
        
        if not drivers:
            print("No hay conductores para migrar.")
        else:
            cursor.execute("SET IDENTITY_INSERT users_app ON")
            for d in drivers:
                nombre, email, contrasena, role, creado, idop, tel, old_id = d
                cursor.execute(
                    "INSERT INTO users_app (user_id, nombre, email, contrasena, role, creado_desde, idoperador, usertelefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (old_id, nombre, email, contrasena, role, creado, idop, tel)
                )
                print(f"Migrado: {email} (ID: {old_id})")
            cursor.execute("SET IDENTITY_INSERT users_app OFF")

        # 3. Quitar restricción vieja
        print("\n3. Actualizando relaciones...")
        try:
            cursor.execute("ALTER TABLE drivers DROP CONSTRAINT FK_drivers_users")
            print("FK vieja eliminada.")
        except Exception as e:
            print(f"Aviso FK: {e}")

        # 4. Eliminar de 'users'
        print("Eliminando de tabla 'users'...")
        cursor.execute("DELETE FROM users WHERE role = 'driver'")

        # 5. Intentar poner la nueva FK (esto puede fallar si hay IDs huérfanos)
        print("Creando nueva restricción FK...")
        try:
            cursor.execute("ALTER TABLE drivers ADD CONSTRAINT FK_drivers_users_app FOREIGN KEY (user_id) REFERENCES users_app(user_id)")
            print("FK nueva creada.")
        except Exception as e:
            print(f"No se pudo crear la FK (probablemente por IDs como el manager Yan Franco): {e}")

        conn.commit()
        print("\n=== MIGRACIÓN COMPLETADA Y COMPROMETIDA ===")

    except Exception as e:
        print(f"\nERROR CRÍTICO: {e}")
        if 'conn' in locals(): conn.rollback()
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    run_migration()
