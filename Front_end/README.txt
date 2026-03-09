EJEMPLO DE ESTRUCTURA DE BASE DE DATOS (PUEDE CAMBIAR SEGUN LAS DECISIONES DE DESARROLLO)

# Frontend - Driver Tracking System

Interfaz web del sistema de tracking de conductores.  
Permite visualizar conductores en el mapa y consultar su ubicación.

## Tecnologías

- HTML
- CSS
- JavaScript

## Funcionalidades

- inicio de sesión de usuario
- visualización de conductores
- visualización de ubicaciones en mapa
- consulta de información de conductores

## Comunicación con el backend

El frontend se comunica con la API del backend mediante solicitudes HTTP.

Ejemplo de endpoints utilizados:

GET /drivers  
Obtiene la lista de conductores.

POST /drivers/location  
Envía la ubicación del conductor.

## Estructura del frontend

frontend/
│
src/ → código principal  
public/ → archivos públicos  
styles/ → hojas de estilo  
scripts/ → lógica en JavaScript  

## Ejecución

Abrir el archivo principal en el navegador o ejecutar el servidor de desarrollo del frontend.
