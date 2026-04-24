import pyodbc
conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=transfleet.mssql.somee.com;Database=transfleet;Uid=wascar23_SQLLogin_1;Pwd=jcsinnz5sy;TrustServerCertificate=yes;"
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()
cursor.execute("UPDATE request SET lat_origen = 18.5020, lon_origen = -69.8590 WHERE tracking_code = '886BA45F'")
conn.commit()
conn.close()
print("Fixed coordinates.")
