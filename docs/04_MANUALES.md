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
    EMAIL_USER=catira3132@mail.com        # Requerido para notificaciones
    EMAIL_PASS=tu_contraseña_aplicacion   # Obtener desde Google App Passwords
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

### 1.4 Acceso Rápido de Demo (Magic Login)
Para presentaciones rápidas o pruebas locales sin base de datos poblada, use la ruta:
`http://localhost:3000/api/magic/login?role=1` (1=Admin, 2=Residente, 3=Seguridad).
Este comando activará el **Modo Nuclear** si la BD no está disponible, inyectando un usuario mock autorizado.

---

## 👨‍💻 2. MANUAL TÉCNICO (DESARROLLADOR)

### 2.1 Estructura del Proyecto
*   `/backend/src/config/`: Configuraciones (DB pool, Socket.IO, Swagger).
*   `/backend/src/controllers/`: Lógica de negocio (8 controladores: auth, user, device, access, transport, stats, notification, config).
*   `/backend/src/middlewares/`: Autenticación JWT, Seguridad (Helmet, Rate Limiting, Validación), Upload de archivos.
*   `/backend/src/routes/`: Rutas de la API REST (8 archivos).
*   `/backend/src/services/`: Servicios externos (Email con Nodemailer).
*   `/backend/src/utils/`: Utilidades (Backups, Logger, Seed).
*   `/frontend/`: Interfaz SPA con Glassmorphism y PWA.
*   **[NUEVO]** `/backend/src/controllers/magic.controller.js`: Lógica de contingencia y Zero-Auth.
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
POST /api/auth/mfa/login         - Verificar código MFA para login
POST /api/auth/forgot-password   - Solicitar código de recuperación
POST /api/auth/reset-password    - Restablecer contraseña
POST /api/magic/login            - Acceso rápido (Zero-Auth) para demos
GET  /api/usuarios               - Listar usuarios
POST /api/usuarios               - Crear usuario
PUT  /api/usuarios/:id           - Actualizar usuario
DELETE /api/usuarios/:id         - Desactivar usuario (soft delete)
POST /api/usuarios/:id/photo     - Subir foto de perfil
GET  /api/dispositivos           - Listar medios (vehículos)
POST /api/dispositivos           - Crear medio (vehículo)
GET  /api/equipos                - Listar activos tecnológicos (laptops, etc.)
POST /api/equipos                - Registrar activo tecnológico
PUT  /api/equipos/:id            - Actualizar activo tecnológico
GET  /api/stats/advanced         - Analíticas gráficas avanzadas
GET  /api/notificaciones         - Mis notificaciones
PATCH /api/notificaciones/:id/read - Marcar como leída
GET  /api/config                 - Obtener configuración global
PATCH /api/config                - Actualizar configuración (Admin)
GET  /api/usuarios/me            - Mi perfil actual
PUT  /api/usuarios/me            - Actualizar mis datos
POST /api/usuarios/me/photo      - Subir mi foto de perfil
```

> 📘 Documentación interactiva en: `http://localhost:3000/api-docs` (Swagger)

---

## 👥 3. MANUAL DE USUARIO (CLIENTE)

### 3.1 Inicio de Sesión
Ingrese su correo electrónico, contraseña y seleccione su rol. 
*   **MFA (2FA)**: Si su cuenta tiene activada la autenticación de dos factores, el sistema le solicitará un código de 6 dígitos generado por su aplicación (Google Authenticator, Authy, etc.) después de validar su contraseña.
*   **Intentos**: Si falla 3 veces, el sistema mostrará un enlace para recuperar contraseña.

### 3.2 Recuperación de Contraseña
1.  Haga clic en "¿Olvidaste tu contraseña?"
2.  Ingrese su correo electrónico.
3.  Recibirá un código de 6 dígitos en su email (válido por 15 minutos).
4.  Ingrese el código y su nueva contraseña.

### 3.3 Registro y Bienvenida
Al ser registrado en el sistema (por usted mismo o por un administrador), recibirá un correo electrónico de bienvenida con un enlace al Dashboard y un resumen de las funcionalidades iniciales.

### 3.4 Autenticación de Dos Factores (MFA)
El sistema Passly soporta seguridad avanzada vía TOTP.
1.  **Configuración**: Diríjase a la sección "Seguridad" en su perfil y active el MFA.
2.  **Vinculación**: Escanee el código QR proporcionado con una aplicación como Google Authenticator.
3.  **Alertas**: Recibirá un correo de seguridad notificando que el 2FA ha sido activado.
4.  **Uso**: Cada vez que inicie sesión, abra su aplicación y escriba el código de 6 dígitos que aparece en pantalla.

### 3.5 Invitaciones para Huéspedes
Si desea invitar a alguien:
1.  Vaya a "Accesos" → "+ Manual".
2.  Ingrese el nombre y el **email** del invitado.
3.  Seleccione el tiempo de expiración.
4.  El invitado recibirá automáticamente un correo con su código QR de acceso.

### 3.3 Uso del Dashboard
*   **Estadísticas**: El panel superior muestra usuarios activos, accesos del día, dispositivos activos y alertas en tiempo real.
*   **Notificaciones**: Acceda a las alertas de sistema desde el ícono de campana en la barra superior.
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

### 3.6 Gestión de Activos Vehiculares
En la pestaña "Dispositivos", puede añadir nuevos vehículos, motocicletas o bicicletas vinculándolos al usuario responsable con un identificador único (placa, serial, etc.).

### 3.7 Gestión de Equipos Tecnológicos
En la sección "Equipos", gestione activos de oficina como laptops y tablets. A diferencia de los vehículos, estos registros permiten rastrear herramientas de trabajo asignadas a empleados.

### 3.7 Exportación de Reportes
*   **CSV**: En "Accesos" → Click en "📊 CSV" → Abra con Excel.
*   **PDF**: En "Accesos" → Click en "📄 PDF" → Descarga reporte profesional con logo y formato corporativo.

### 3.8 Gestión de Usuarios
En la pestaña "Usuarios", los administradores pueden crear, editar, desactivar usuarios y visualizar la ficha maestra detallada de cada persona.

### 3.9 Perfil y Configuración
*   **Mi Perfil**: Haga clic en su nombre en la barra superior para actualizar sus datos personales y cambiar su foto de perfil.
*   **Ajustes de Sistema**: (Solo Admin) En "Configuración", defina el nombre de la sede, tiempos de validez de QR y políticas de auto-registro.

### 3.10 Analíticas Avanzadas
En la pestaña "Analíticas", visualice reportes gráficos sobre tendencias semanales, distribución de medios de transporte y censos de roles de usuario.
