# Database Schema – Driver Tracking System

Este directorio contiene el **esquema de la base de datos** para el sistema de tracking de conductores.

La base de datos está diseñada para funcionar con **PostgreSQL** y permite almacenar información sobre usuarios, conductores, vehículos y ubicaciones en tiempo real.

## Tablas principales

* **users**
  Guarda los usuarios del sistema (administradores o clientes).

* **drivers**
  Contiene la información de los conductores registrados en la plataforma.

* **vehicle**
  Relaciona los vehículos con los conductores.

* **locations**
  Guarda el historial completo de ubicaciones GPS de los conductores.

* **driver_last_location**
  Guarda la última ubicación conocida de cada conductor para consultas rápidas en el mapa.

## Índices

Se incluyen índices para mejorar el rendimiento en consultas frecuentes como:

* búsqueda de ubicaciones por conductor
* ordenamiento por tiempo
* búsqueda de vehículos por conductor

## Uso

1. Crear una base de datos en PostgreSQL.

2. Ejecutar el archivo:

schema.sql

Esto creará todas las tablas, relaciones e índices necesarios para el sistema.

## Tecnologías relacionadas

* Backend: FastAPI
* Base de datos: PostgreSQL
* Frontend: aplicación web o móvil con mapa en tiempo real


