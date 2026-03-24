# 🔑 Guía de Conexión - Login Sistema TransFleet

## ✅ Estado Actual

El sistema de login está **completamente conectado** entre frontend y backend.

---

## 📋 Componentes Implementados

### Backend (FastAPI) ✅
- **Endpoint**: `POST /api/login`
- **Location**: `Backend_fastapi/app/routers/users.py` + `app/main.py`
- **Funcionalidad**: 
  - Valida email y contraseña
  - Genera Token JWT
  - Retorna datos del usuario

### Frontend (HTML/JS) ✅
- **Archivo**: `Front_end/Proyecto/login.html`
- **Estilos**: `Front_end/Proyecto/css/login.css`
- **Script**: `Front_end/Proyecto/js/login.js`
- **Funcionalidad**:
  - Formulario de login responsivo
  - Validación de campos
  - Almacenamiento de token en localStorage
  - Redirección automática al dashboard

---

## 🚀 Cómo Ejecutar

### 1️⃣ Instalar Dependencias Backend

```bash
cd Backend_fastapi
pip install -r requirements.txt
```

**Nuevos paquetes agregados:**
- `PyJWT` - Para generar y validar tokens JWT
- `python-dotenv` - Para variables de entorno

### 2️⃣ Iniciar el Backend

```bash
# Desde Backend_fastapi
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

El servidor estará disponible en: `http://127.0.0.1:8000`

### 3️⃣ Acceder al Login

Abre tu navegador en:
```
http://127.0.0.1:8000/login.html
```

---

## 📝 Datos de Prueba

### Crear un usuario primero:

**Opción A: Usando API Directa**

```bash
curl -X POST "http://127.0.0.1:8000/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Admin Usuario",
    "email": "admin@transfleet.com",
    "contrasena": "admin123",
    "role": "admin"
  }'
```

**Opción B: Usando Python**

```python
import requests

response = requests.post(
    "http://127.0.0.1:8000/users/",
    json={
        "nombre": "Admin Usuario",
        "email": "admin@transfleet.com",
        "contrasena": "admin123",
        "role": "admin"
    }
)
print(response.json())
```

### Luego hacer Login:

**En el formulario:**
- Email: `admin@transfleet.com`
- Contraseña: `admin123`

---

## 🔒 Flujo de Autenticación

```
1. Usuario abre login.html
   ↓
2. Ingresa email y contraseña
   ↓
3. Frontend envía POST a /api/login
   ↓
4. Backend verifica credenciales en BD
   ↓
5. Si es válido:
   - Genera JWT Token
   - Retorna { token, user }
   ↓
6. Frontend almacena en localStorage:
   - authToken
   - user (datos del usuario)
   ↓
7. Se redirige a index.html
   ↓
8. index.html verifica authToken
   - Si existe → carga dashboard
   - Si no existe → redirige a login.html
```

---

## 📂 Archivos Modificados

### Backend
- ✅ `Backend_fastapi/app/routers/users.py` - Agregado endpoint `/login`
- ✅ `Backend_fastapi/app/schemas.py` - Agregadas schemas `UserLogin` y `LoginResponse`
- ✅ `Backend_fastapi/app/main.py` - Agregado endpoint `/api/login`
- ✅ `Backend_fastapi/requirements.txt` - Agregadas dependencias

### Frontend (ya existentes, funcionales)
- ✅ `Front_end/Proyecto/login.html` - Página de login
- ✅ `Front_end/Proyecto/css/login.css` - Estilos
- ✅ `Front_end/Proyecto/js/login.js` - Lógica de login

---

## 🔐 Seguridad (⚠️ Notas Importantes)

### Actual (Desarrollo)
```python
# ⚠️ Las contraseñas se almacenan en TEXTO PLANO
# ⚠️ Esto es SOLO para desarrollo
if user.contrasena != login_data.password:
    # Comparación directa - NO SEGURA
```

### Para Producción
Necesitas implementar hashing seguro:

```python
from passlib.context import CryptContext
from passlib.hash import bcrypt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Al crear usuario:
hashed_password = pwd_context.hash(password)

# Al verificar:
if not pwd_context.verify(password, user.contrasena):
    raise HTTPException(status_code=401)
```

Instala: `pip install passlib bcrypt`

---

## 🧪 Pruebas

### Test 1: Crear Usuario

```bash
curl -X POST "http://127.0.0.1:8000/users/" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@test.com","contrasena":"1234","role":"user"}'
```

### Test 2: Login Exitoso

```bash
curl -X POST "http://127.0.0.1:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"1234"}'
```

Respuesta esperada:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@test.com",
    "name": "Test",
    "role": "user"
  }
}
```

### Test 3: Login Fallido

```bash
curl -X POST "http://127.0.0.1:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpassword"}'
```

Respuesta esperada:
```json
{
  "detail": "Email o contraseña incorrectos"
}
```

---

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en `Backend_fastapi/`:

```env
SECRET_KEY=tu-clave-secreta-segura-aqui
DATABASE_URL=postgresql://user:password@localhost/transfleet
```

---

## 📚 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/login` | Login (retorna token) |
| `GET` | `/users/` | Obtener todos los usuarios |
| `POST` | `/users/` | Crear nuevo usuario |
| `GET` | `/users/{user_id}` | Obtener usuario por ID |
| `PUT` | `/users/{user_id}` | Actualizar usuario |
| `DELETE` | `/users/{user_id}` | Eliminar usuario |

---

## 🐛 Troubleshooting

### "Error: 404 Not Found"
- ✅ Verifica que el backend esté corriendo en `127.0.0.1:8000`
- ✅ Verifica que la URL sea `/api/login` (no `/users/login`)

### "Error: CORS"
- ✅ El backend tiene CORS habilitado globalmente
- ✅ Si no funciona, reinicia el servidor

### "Error: Email o contraseña incorrectos"
- ✅ Verifica que el usuario existe en la BD
- ✅ Verifica que la contraseña es exacta (case-sensitive)

### "ModuleNotFoundError: No module named 'jwt'"
- ✅ Instala: `pip install PyJWT`

---

## ✨ Próximas Mejoras

1. **Seguridad**
   - [ ] Implementar bcrypt para hashing de contraseñas
   - [ ] Validar con middleware de JWT
   - [ ] Rate limiting en login
   - [ ] 2FA (Autenticación de dos factores)

2. **Funcionalidades**
   - [ ] Endpoint `/refresh` para renovar tokens
   - [ ] Endpoint `/logout` para invalidar tokens
   - [ ] Endpoint `/register` para registro de usuarios
   - [ ] Recuperación de contraseña

3. **Frontend**
   - [ ] Mostrar errores más específicos
   - [ ] Validación de email en tiempo real
   - [ ] Recuperación de contraseña
   - [ ] Registro de usuarios

---

## 📞 Soporte

Si encuentras problemas:

1. Verifica que el backend esté corriendo
2. Revisa la consola del navegador (F12)
3. Revisa los logs del servidor backend
4. Verifica que la Base de Datos esté conectada

---

**Última actualización**: Marzo 2026  
**Versión**: 1.0  
**Estado**: ✅ Funcional y listo para usar
