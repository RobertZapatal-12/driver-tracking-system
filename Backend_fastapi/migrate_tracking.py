import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # 1. Crear driver_trips si no existe
    create_table_sql = """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='driver_trips' and xtype='U')
    CREATE TABLE driver_trips (
        trip_id INT PRIMARY KEY IDENTITY(1,1),
        driver_id INT,
        request_id INT,
        estado VARCHAR(50) DEFAULT 'En curso',
        inicio DATETIME DEFAULT GETDATE(),
        fin DATETIME NULL,
        lat_inicio FLOAT NULL,
        lon_inicio FLOAT NULL,
        lat_fin FLOAT NULL,
        lon_fin FLOAT NULL
    )
    """
    cursor.execute(create_table_sql)
    print("Checked/Created driver_trips table.")

    # 2. Actualizar Request si faltan columnas
    cols_to_add = [
        ("tracking_code", "VARCHAR(20)"),
        ("lat_origen", "FLOAT"),
        ("lon_origen", "FLOAT"),
        ("lat_destino", "FLOAT"),
        ("lon_destino", "FLOAT")
    ]
    
    for col, type in cols_to_add:
        try:
            cursor.execute(f"ALTER TABLE request ADD {col} {type}")
            print(f"Added {col} to request.")
        except:
            pass

    conn.commit()
    print("Migration finished.")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
