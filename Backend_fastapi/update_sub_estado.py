import pyodbc
conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # 1. Agregar columna sub_estado
    try:
        cursor.execute("ALTER TABLE request ADD sub_estado VARCHAR(50) DEFAULT 'pendiente'")
        print("Added sub_estado to request.")
    except:
        pass

    # 2. Actualizar Request 6
    cursor.execute("""
        UPDATE request 
        SET lat_origen = 18.5030, lon_origen = -69.8600, 
            sub_estado = 'buscando_cliente'
        WHERE tracking_code = '886BA45F'
    """)
    print("Updated Request 6 coordinates and sub_estado.")
    
    conn.commit()
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
