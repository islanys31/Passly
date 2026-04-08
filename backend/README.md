# Passly Backend - Node.js + Express + MySQL

Backend profesional para el sistema de gestión de accesos Passly.

## 🚀 Características

- ✅ **Servidor estable**: No crashea si la base de datos no está disponible
- ✅ **Configuración flexible**: 100% configurable vía variables de entorno
- ✅ **Base de datos remota**: Preparado para MySQL local o en la nube
- ✅ **Pool de conexiones**: Gestión eficiente de conexiones con `mysql2`
- ✅ **Separación de responsabilidades**: Código modular y mantenible
- ✅ **Autenticación JWT**: Sistema seguro de autenticación
- ✅ **Logs claros**: Información detallada del estado del servidor y BD

## 📋 Requisitos

- Node.js 14+ 
- MySQL 5.7+ o 8.0+ (local o remoto)
- npm o yarn

## 🔧 Instalación

### 1. Clonar e instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
copy .env.example .env
```

Edita el archivo `.env` con tus datos:

```env
PORT=3000
NODE_ENV=development

# Configuración de Base de Datos
DB_HOST=127.0.0.1          # Para local: 127.0.0.1 o localhost
                            # Para remoto: tu-servidor.com o IP
DB_USER=root                # Usuario de MySQL
DB_PASSWORD=tu_password     # Contraseña de MySQL
DB_NAME=passly              # Nombre de la base de datos
DB_PORT=3306                # Puerto de MySQL (por defecto 3306)

# Configuración JWT
JWT_SECRET=tu_secreto_super_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=24h
```

### 3. Crear la base de datos

Si tu base de datos no existe, créala manualmente:

```sql
CREATE DATABASE passly;
```

Luego ejecuta el script SQL de inicialización ubicado en `../database/passly.sql`

## 🎯 Uso

### Desarrollo

```bash
npm run dev
```

El servidor iniciará en `http://localhost:3000` (o el puerto configurado en `.env`)

### Producción

```bash
npm start
```

## 📡 Endpoints Disponibles

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión

### Usuarios
- `GET /api/usuarios` - Listar usuarios
- `GET /api/usuarios/:id` - Obtener usuario por ID
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Desactivar usuario

### Dispositivos
- `GET /api/dispositivos` - Listar dispositivos
- `POST /api/dispositivos` - Crear dispositivo
- `PUT /api/dispositivos/:id` - Actualizar dispositivo
- `DELETE /api/dispositivos/:id` - Desactivar dispositivo

### Medios de Transporte
- `GET /api/medios-transporte` - Listar medios de transporte

### Accesos
- `GET /api/accesos` - Listar registros de acceso
- `POST /api/accesos` - Registrar nuevo acceso

## 🔒 Autenticación

Para endpoints protegidos, incluye el token JWT en el header:

```
Authorization: Bearer <tu_token_jwt>
```

## 🏗️ Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # Configuración de base de datos
│   ├── controllers/           # Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── device.controller.js
│   │   ├── transport.controller.js
│   │   └── access.controller.js
│   ├── middlewares/           # Middlewares personalizados
│   │   └── authMiddleware.js
│   ├── routes/                # Definición de rutas
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── device.routes.js
│   │   ├── transport.routes.js
│   │   └── access.routes.js
│   └── app.js                 # Configuración de Express
├── server.js                  # Punto de entrada
├── .env                       # Variables de entorno (NO subir a git)
├── .env.example               # Plantilla de variables de entorno
└── package.json
```

## 🛠️ Cambios Realizados (Hardening)

### ✅ 1. Gestión Robusta de la Base de Datos

**Antes:**
- El servidor crasheaba si la BD no estaba disponible
- Conexión bloqueaba el inicio del servidor

**Ahora:**
- El servidor inicia **siempre**, incluso sin BD
- Logs claros de conexión exitosa o fallida
- Pool de conexiones optimizado

**Archivos modificados:**
- `src/config/db.js` - Exporta `pool` y `checkConnection()`
- `server.js` - Inicia servidor primero, luego verifica BD

### ✅ 2. Variables de Entorno Completas

**Agregado:**
- `DB_PORT` - Puerto configurable de MySQL
- `NODE_ENV` - Entorno de ejecución
- `.env.example` - Documentación de variables requeridas

**Archivos modificados:**
- `.env` - Variables actualizadas
- `.env.example` - Creado desde cero

### ✅ 3. Separación de Responsabilidades

**Antes:**
- `server.js` mezclaba inicio y conexión a BD
- `db.js` solo exportaba el pool

**Ahora:**
- `db.js` - Solo gestión de conexión
- `server.js` - Solo inicio del servidor
- Controladores actualizados para usar `{ pool: db }`

### ✅ 4. Compatibilidad Multi-Entorno

El backend ahora funciona en:
- ✅ Desarrollo local (Windows/Mac/Linux)
- ✅ Servidores remotos
- ✅ Servicios cloud (AWS RDS, Google Cloud SQL, etc.)

Solo cambiando las variables en `.env`

## 🌐 Uso en Otro Computador

1. Clona el repositorio
2. Copia `.env.example` a `.env`
3. Configura tus credenciales de MySQL en `.env`
4. Ejecuta `npm install`
5. Ejecuta `npm run dev`

**No necesitas tener MySQL instalado localmente** si usas una base de datos remota.

## 🐛 Troubleshooting

### El servidor no conecta a la base de datos

**Síntoma:**
```
⚠️ Error al conectar con la base de datos: connect ECONNREFUSED
```

**Soluciones:**
1. Verifica que MySQL esté corriendo
2. Confirma las credenciales en `.env`
3. Si usas `localhost`, prueba con `127.0.0.1`
4. Verifica el puerto (por defecto 3306)
5. Revisa el firewall si es remoto

### Error de autenticación

**Síntoma:**
```
⚠️ Error al conectar con la base de datos: Access denied for user
```

**Soluciones:**
1. Verifica `DB_USER` y `DB_PASSWORD` en `.env`
2. Confirma que el usuario tenga permisos en la BD
3. Si es MySQL 8+, verifica el método de autenticación

### Base de datos no existe

**Síntoma:**
```
⚠️ Error al conectar con la base de datos: Unknown database 'passly'
```

**Solución:**
```sql
CREATE DATABASE passly;
```

## 📝 Notas Importantes

- **Seguridad**: Cambia `JWT_SECRET` en producción
- **Git**: El archivo `.env` está en `.gitignore` (no se sube al repo)
- **Producción**: Usa `NODE_ENV=production` y credenciales seguras
- **Pool**: El límite de conexiones es 10 (ajustable en `db.js`)

## 👨‍💻 Desarrollo

Para agregar nuevas rutas:

1. Crea el controlador en `src/controllers/`
2. Define las rutas en `src/routes/`
3. Registra las rutas en `src/app.js`
4. Usa `const { pool: db } = require('../config/db')` en controladores

## 📄 Licencia

Proyecto privado - Passly © 2026
