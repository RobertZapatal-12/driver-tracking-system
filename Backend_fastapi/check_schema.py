import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # 1. Obtener columnas de 'users'
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users'")
    columns = cursor.fetchall()
    print("Esquema de 'users':")
    for col in columns:
        print(col)

    # 2. Verificar si 'users_app' existe realmente
    cursor.execute("SELECT * FROM sysobjects WHERE name='users_app' and xtype='U'")
    if cursor.fetchone():
        print("\n¡La tabla 'users_app' SÍ existe en el servidor!")
    else:
        print("\nLa tabla 'users_app' NO existe.")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
