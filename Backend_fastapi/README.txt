EJEMPLO DE ESTRUCTURA DE BASE DE DATOS (PUEDE CAMBIAR SEGUN LAS DECISIONES DE DESARROLLO)

# Backend - Driver Tracking System

Backend del sistema de tracking de conductores.  
Proporciona una API para gestionar conductores y recibir sus ubicaciones.

## Tecnologías

- Python
- FastAPI
- Uvicorn

## Descripción

El backend expone endpoints que permiten:

- registrar conductores
- recibir ubicaciones de conductores
- consultar conductores
- obtener información específica de un conductor

La API se comunica con el frontend mediante solicitudes HTTP.

## Instalación

1. Entrar en la carpeta del backend

cd Backend_fastapi

2. Instalar dependencias

pip install -r requirements.txt

## Ejecutar el servidor

uvicorn app.main:app --reload

El servidor estará disponible en:

http://127.0.0.1:8000

## Documentación automática

La API genera documentación automática en:

http://127.0.0.1:8000/docs

## Endpoints principales

GET /drivers  
Obtiene la lista de conductores.

GET /drivers/{id}  
Obtiene información de un conductor específico.

POST /drivers  
Registra un nuevo conductor.

POST /drivers/location  
Envía la ubicación de un conductor.

## Estructura del backend

backend/
│
app/
│
main.py → punto de entrada de la API  
routes/ → endpoints  
models/ → modelos de datos  
services/ → lógica del sistema  

requirements.txt → dependencias del proyecto