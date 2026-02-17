# 📔 MANUALES DE OPERACIÓN - PASSLY

## 🛠️ 1. MANUAL DE INSTALACIÓN (ADMINISTRADOR)

### 1.1 Requisitos Previos
*   Docker y Docker Compose instalados.
*   Puerto 80 y 443 libres en el host.

### 1.2 Pasos para el Despliegue
1.  **Clonar el repositorio** o copiar los archivos al servidor.
2.  **Configurar Variables**: Crear/Editar el archivo `.env` en la raíz (usar `.env.example` como base).
3.  **Levantar Contenedores**:
    ```bash
    docker-compose up -d --build
    ```
4.  **Verificar Salud**: Ejecutar `docker ps` para confirmar que `passly-api`, `passly-db` y `passly-proxy` están corriendo.

---

## 👨‍💻 2. MANUAL TÉCNICO (DESARROLLADOR)

### 2.1 Estructura del Proyecto
*   `/backend/src`: Controladores, Rutas y Middlewares (MVC).
*   `/frontend`: Dashboard y páginas de autenticación.
*   `/nginx`: Configuración del servidor de borde.
*   `/database`: Scripts de inicialización.

### 2.2 Seguridad (Hardening)
*   **Contraseñas**: Se encriptan con `bcrypt` usando un factor de costo 10 antes de entrar a la BD.
*   **Tokens**: Se generan con `jsonwebtoken` (JWT) incluyendo un `purpose` y expiración.
*   **Headers**: Nginx oculta la versión del servidor y Express usa `Helmet.js` para CSP y HSTS.

---

## 👥 3. MANUAL DE USUARIO (CLIENTE)

### 3.1 Inicio de Sesión
Ingrese su correo electrónico institucional. Si falla 3 veces, el sistema mostrará un enlace para recuperar contraseña.

### 3.2 Uso del Dashboard
*   **Estadísticas**: El panel superior muestra la ocupación y alertas en tiempo real.
*   **Registrar Acceso**:
    1. Click en "Registrar Acceso" (+).
    2. Seleccione el usuario de la lista desplegable.
    3. Seleccione el dispositivo (si aplica).
    4. Guardar. El sistema notificará a todos los administradores conectados.

### 3.3 Gestión de Dispositivos
En la pestaña "Dispositivos", puede añadir nuevas placas de vehículos o seriales de bicicletas vinculándolos permanentemente al empleado responsable.
