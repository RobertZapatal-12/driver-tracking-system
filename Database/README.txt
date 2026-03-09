EJEMPLO DE ESTRUCTURA DE BASE DE DATOS (PUEDE CAMBIAR SEGUN LAS DECISIONES DE DESARROLLO)

# Database - Driver Tracking System

Base de datos utilizada para almacenar información de usuarios, conductores y ubicaciones.

## Tecnologías

- PostgreSQL
- PostGIS

## Descripción

La base de datos almacena información geográfica para permitir el seguimiento de conductores y el cálculo de rutas o distancias.

## Tablas principales

drivers  
Información de los conductores.

locations  
Ubicación geográfica de los conductores con coordenadas y timestamp.

users  
Usuarios del sistema.

## Estructura

database/
│
schema.sql → definición de tablas  
seed.sql → datos de prueba  
migrations/ → cambios en la estructura de la base de datos  

## Ejemplo de estructura de tabla

drivers

id  
name  

locations

driver_id  
latitude  
longitude  
timestamp
