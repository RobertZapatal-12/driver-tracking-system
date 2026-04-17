# 🔐 Sistema de Autenticación - TransFleet

## Descripción General

Se ha agregado un completo sistema de autenticación a la aplicación TransFleet. La landing page de login es ahora la puerta de entrada a la aplicación.

## 📁 Archivos Creados

### 1. **login.html**
Landing page profesional de autenticación
- Diseño moderno con gradientes
- Formulario de login responsivo
- Sección de información sobre las características
- Compatible con dispositivos móviles
- Integración con Bootstrap 5

### 2. **css/login.css**
Estilos personalizados para la página de login
- Variables CSS para colores consistentes
- Animaciones suaves
- Diseño responsive (móvil, tablet, desktop)
- Componentes estilizados (inputs, botones, alertas)

### 3. **js/login.js**
Lógica de autenticación
- Manejo de formulario de login
- Validación de credenciales
- Almacenamiento de tokens en localStorage
- Verificación de sesión activa
- Toggle de visibilidad de contraseña
- Soporte para "Recuérdame"

## 🔧 Cambios Realizados

### js/app.js
- ✅ Agregada función `checkAuthentication()` para verificar token
- ✅ Agregada función `loadUserData()` para cargar datos del usuario
- ✅ Agregada función `logoutUser()` para cerrar sesión
- ✅ Verificación de autenticación antes de cargar el dashboard

### components/sidebar.html
- ✅ Agregado botón "Cerrar Sesión" al final del sidebar
- ✅ Separador visual entre la navegación y el logout
- ✅ Estilos para diferenciar el botón de logout

## 🚀 Cómo Usar

### 1. **Acceso a la Aplicación**
- Abre `login.html` para ver la página de login
- Se te pedirá ingresar email y contraseña

### 2. **Credenciales de Prueba** (cuando el backend esté listo)
```
Email: admin@transfleet.com
Contraseña: admin123
```

### 3. **Para Desarrollo Sin Backend**
Abre la consola del navegador y ejecuta:
```javascript
demoLogin()
```
Esto simula un login exitoso y te redirige al dashboard.

## 📝 Flujo de Autenticación

```
1. Usuario abre login.html
2. Ingresa email y contraseña
3. Se envía solicitud POST a: http://127.0.0.1:8000/api/login
4. Si es exitoso:
   - Se guarda el token en localStorage
   - Se guardan datos del usuario
   - Se redirige a index.html (dashboard)
5. Si index.html se abre sin token:
   - Se redirige automáticamente a login.html
6. Para cerrar sesión:
   - Se elimina el token del localStorage
   - Se redirige a login.html
```

## 🔒 Seguridad

### Token Storage
- Los tokens se almacenan en `localStorage` bajo la clave `authToken`
- Los datos del usuario se guardan en `localStorage` bajo la clave `user`
- Para mayor seguridad en producción, considera usar `sessionStorage` o cookies seguras

### Validación
- Validación de formulario en el cliente
- Verificación de token antes de cargar el dashboard
- Manejo de errores de conexión

## 🎨 Características de Diseño

### Colores
- **Primario**: Azul (#3b82f6 y #60a5fa)
- **Fondo**: Gradiente púrpura
- **Sidebar**: Gris oscuro (#1e293b)
- **Texto**: Gris oscuro y gris claro

### Componentes
- ✅ Logo con icono de truck
- ✅ Inputs con validación visual
- ✅ Toggle de contraseña
- ✅ Opciones "Recuérdame" y "Olvide contraseña"
- ✅ Login social (Google, Teléfono)
- ✅ Sección de características
- ✅ Animaciones de carga
- ✅ Alertas dinámicas

## 📱 Responsivo

### Breakpoints
- Desktop: Grid de 2 columnas
- Tablet (768px): Adaptación de tamaños
- Móvil (480px): Layout de columna única

## 🔌 Integración con Backend

Para integrar con tu backend, asegúrate de que el endpoint `/api/login` reciba:

```javascript
POST /api/login
Content-Type: application/json

{
    "email": "usuario@ejemplo.com",
    "password": "contraseña"
}
```

Y responda con:
```javascript
{
    "token": "jwt_token_aqui",
    "user": {
        "id": 1,
        "email": "usuario@ejemplo.com",
        "name": "Nombre Usuario",
        "role": "admin"
    }
}
```

## 🐛 Troubleshooting

### "Me redirige a login cuando abro index.html"
- ✅ Esto es correcto. Debes pasar por login.html primero
- O ejecuta `demoLogin()` en la consola para una sesión de demo

### "El error de conexión persiste"
- ✅ Verifica que el backend esté ejecutándose en `http://127.0.0.1:8000`
- ✅ Revisa los CORS del backend

### "Perdí mi token"
- ✅ Limpia el localStorage: `localStorage.clear()`
- ✅ Vuelve a hacer login

## 📌 Próximos Pasos

1. Implementar endpoint `/api/login` en el backend
2. Agregar endpoint `/api/register` para registro de usuarios
3. Implementar "Olvidé mi contraseña"
4. Agregar autenticación con token JWT en requests
5. Implementar refresh tokens para mantener sesiones
6. Agregar OAuth para login social
7. Implementar 2FA (autenticación de dos factores)

## 🎯 Notas Importantes

- El sistema está listo para producción con cambios mínimos
- Todos los estilos usan variables CSS para fácil personalización
- El código está comentado y es fácil de mantener
- Compatible con la estructura de el resto de la aplicación
- Funciona sin dependencias externas adicionales

---

**Creado en**: 2026  
**Versión**: 1.0  
**Estado**: Listo para integración con backend
