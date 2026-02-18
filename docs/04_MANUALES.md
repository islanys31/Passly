# 📔 MANUALES DE OPERACIÓN - PASSLY

## 🛠️ 1. MANUAL DE INSTALACIÓN (ADMINISTRADOR)

### 1.1 Requisitos Previos

#### Opción A: Desarrollo Local
*   Node.js 18+ y npm instalados.
*   MySQL 8.0+ corriendo.
*   Puerto 3000 libre.

#### Opción B: Docker (Producción)
*   Docker y Docker Compose instalados.
*   Puerto 80 libre en el host.

### 1.2 Instalación Local (Desarrollo)
1.  **Clonar el repositorio** o copiar los archivos al servidor.
2.  **Crear la base de datos**:
    ```bash
    mysql -u root -p < database/passly.sql
    ```
3.  **Configurar Variables**: Crear/Editar el archivo `.env` en la carpeta `backend/` (usar `.env.example` como base):
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=tu_contraseña
    DB_NAME=passly
    DB_PORT=3306
    JWT_SECRET=tu_clave_secreta_muy_segura
    PORT=3000
    NODE_ENV=development
    EMAIL_USER=tu_correo@gmail.com        # Opcional
    EMAIL_PASS=tu_contraseña_aplicacion   # Opcional
    ```
4.  **Instalar dependencias e iniciar**:
    ```bash
    cd backend
    npm install
    npm run dev
    ```
5.  **Verificar**: Abrir `http://localhost:3000` en el navegador.

### 1.3 Despliegue con Docker (Producción)
1.  **Configurar Variables**: Editar credenciales en `docker-compose.yml`.
2.  **Levantar Contenedores**:
    ```bash
    docker-compose up -d --build
    ```
3.  **Verificar Salud**: Ejecutar `docker ps` para confirmar que `passly-api`, `passly-db` y `passly-web` están corriendo.
4.  **Acceder**: Abrir `http://localhost` (puerto 80 vía Nginx).

---

## 👨‍💻 2. MANUAL TÉCNICO (DESARROLLADOR)

### 2.1 Estructura del Proyecto
*   `/backend/src/config/`: Configuraciones (DB pool, Socket.IO, Swagger).
*   `/backend/src/controllers/`: Lógica de negocio (6 controladores: auth, user, device, access, transport, stats).
*   `/backend/src/middlewares/`: Autenticación JWT, Seguridad (Helmet, Rate Limiting, Validación), Upload de archivos.
*   `/backend/src/routes/`: Rutas de la API REST (6 archivos).
*   `/backend/src/services/`: Servicios externos (Email con Nodemailer).
*   `/backend/src/utils/`: Utilidades (Backups programados).
*   `/frontend/`: Dashboard, autenticación, escáner QR y páginas de recuperación.
*   `/nginx/`: Configuración del reverse proxy (Gzip, WebSocket proxy).
*   `/database/`: Script SQL de inicialización.

### 2.2 Seguridad (Hardening)
*   **Contraseñas**: Se encriptan con `bcrypt` usando un factor de costo 10 antes de entrar a la BD.
*   **Tokens**: Se generan con `jsonwebtoken` (JWT) incluyendo `id`, `email`, `rol_id` y expiración configurable.
*   **Headers**: Express usa `Helmet.js` para CSP (scripts solo de CDN autorizados) y HSTS (1 año, preload).
*   **Rate Limiting**: Login: 100/15min, Registro: 50/h, Recuperación: 3/h, API global: 100/15min.
*   **Validaciones**: `express-validator` con reglas estrictas: emails solo @gmail/@hotmail, contraseñas 8-12 caracteres con mayúscula, minúscula, número y especial, nombres solo letras y acentos.
*   **Sanitización**: Eliminación automática de tags HTML (`<>`) en todos los inputs.
*   **JWT Hardened**: Verificación de propósito del token (tokens de recovery no sirven para sesión) y estado del usuario en BD en cada request.

### 2.3 API Endpoints

```
POST /api/auth/register          - Registrar usuario
POST /api/auth/login             - Iniciar sesión
POST /api/auth/forgot-password   - Solicitar código de recuperación
POST /api/auth/reset-password    - Restablecer contraseña
GET  /api/usuarios               - Listar usuarios
POST /api/usuarios               - Crear usuario
PUT  /api/usuarios/:id           - Actualizar usuario
DELETE /api/usuarios/:id         - Desactivar usuario (soft delete)
POST /api/usuarios/:id/photo     - Subir foto de perfil
GET  /api/dispositivos           - Listar dispositivos
POST /api/dispositivos           - Crear dispositivo
PUT  /api/dispositivos/:id       - Actualizar dispositivo
DELETE /api/dispositivos/:id     - Desactivar dispositivo
GET  /api/medios-transporte      - Listar medios de transporte
GET  /api/accesos                - Listar accesos con JOINs
POST /api/accesos                - Registrar acceso manual
GET  /api/accesos/qr             - Generar QR personal
POST /api/accesos/invitation     - Crear invitación QR temporal
POST /api/accesos/scan           - Validar escaneo QR
GET  /api/stats                  - Estadísticas generales
```

> 📘 Documentación interactiva en: `http://localhost:3000/api-docs` (Swagger)

---

## 👥 3. MANUAL DE USUARIO (CLIENTE)

### 3.1 Inicio de Sesión
Ingrese su correo electrónico, contraseña y seleccione su rol. Si falla 3 veces, el sistema mostrará un enlace para recuperar contraseña.

### 3.2 Recuperación de Contraseña
1.  Haga clic en "¿Olvidaste tu contraseña?"
2.  Ingrese su correo electrónico.
3.  Recibirá un código de 6 dígitos en su email (válido por 15 minutos).
4.  Ingrese el código y su nueva contraseña.

### 3.3 Uso del Dashboard
*   **Estadísticas**: El panel superior muestra usuarios activos, accesos del día, dispositivos activos y alertas en tiempo real.
*   **Gráfica**: Visualice el tráfico de accesos por horas del día actual.
*   **Últimos Accesos**: Tabla actualizada en tiempo real vía WebSockets.
*   **QR Personal**: Genere y descargue su código QR para acceso rápido.

### 3.4 Registrar un Acceso
1.  Click en "Accesos" en el menú lateral.
2.  Click en "+ Registro Manual".
3.  Seleccione el usuario, dispositivo (si aplica), tipo (Entrada/Salida) y observaciones.
4.  Guardar. El sistema notificará a todos los administradores conectados.

### 3.5 Sistema QR
*   **QR Personal**: En el dashboard → "Mi Llave QR" → "Generar" → "Descargar".
*   **Invitación QR**: En "Accesos" → "+ Registro Manual" → Pestaña "Nuevo Invitado (QR)" → Ingrese nombre del invitado → Seleccione duración (4h - 1 semana) → Genere y comparta.
*   **Escanear QR**: Click en "📷 Escáner QR" → Permita acceso a la cámara → Apunte al código QR → El sistema registrará el acceso automáticamente.

### 3.6 Gestión de Dispositivos
En la pestaña "Dispositivos", puede añadir nuevos vehículos, motocicletas o bicicletas vinculándolos al usuario responsable con un identificador único (placa, serial, etc.).

### 3.7 Exportación de Reportes
*   **CSV**: En "Accesos" → Click en "📊 CSV" → Abra con Excel.
*   **PDF**: En "Accesos" → Click en "📄 PDF" → Descarga reporte profesional con logo y formato corporativo.

### 3.8 Gestión de Usuarios
En la pestaña "Usuarios", los administradores pueden crear, editar, desactivar usuarios y subir fotos de perfil (JPG/PNG, máximo 2MB).
