# Driver Tracking System

Sistema para monitorear conductores y visualizar su ubicación en un mapa.

## Descripción

Esta aplicación permite registrar conductores, enviar su ubicación y visualizar su posición en tiempo real desde una aplicación web o móvil.

## Arquitectura

Frontend (Aplicación web / móvil)
↓
Backend API
↓
Base de datos

## Tecnologías

Backend
- Python
- FastAPI
- Uvicorn

Frontend
- HTML
- CSS
- JavaScript

Base de datos
- PostgreSQL
- PostGIS

## Estructura del proyecto

driver-tracking-system

backend/ → API y lógica del sistema  
frontend/ → interfaz de usuario  
database/ → scripts y estructura de la base de datos  
docs/ → documentación del sistema  

## Instalación

1. Clonar repositorio

git clone URL_DEL_REPOSITORIO

2. Instalar dependencias

pip install -r requirements.txt

3. Ejecutar servidor

uvicorn app.main:app --reload

O descargar manualmente los archivos.py

## Funcionalidades

- registro de conductores
- envío de ubicación
- visualización de conductores
- consulta de posiciones

## Autor

Luis jose Gonzalez
Robert Yarel Zapata
Yan Franco Caminero
