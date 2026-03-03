# 🧠 GUÍA MAESTRA DE ESTUDIO - PROYECTO PASSLY (v2.0.0 Hardened)

Este documento centraliza toda la información estratégica, técnica y operativa del sistema Passly. Está diseñado para ser procesado por herramientas de mapas mentales (como Mapify o Ideamap) y para funcionar como referencia completa de estudio.

---

## 1. 📋 VISIÓN GENERAL Y PROPÓSITO
**Passly** es un sistema inteligente de control de accesos diseñado para entornos residenciales o empresariales. Combina seguridad física (códigos QR) con seguridad digital avanzada (MFA, JWT, Auditoría).

### 🎯 Objetivos Logrados
- **Accesibilidad**: Generación de códigos QR personales e invitaciones temporales.
- **Seguridad Extrema**: Protección contra ataques comunes (Brute Force, XSS, SQLi).
- **Trazabilidad**: Registro inmutable de cada acción administrativa.
- **Tiempo Real**: Dashboard que se actualiza al instante mediante WebSockets.

---

## 2. 🏗️ ARQUITECTURA TÉCNICA (EL STACK)

### **Backend (Cerebro)**
- **Node.js + Express**: Servidor web modular bajo arquitectura MVC.
- **MySQL 8.0**: Persistencia de datos relacional con pool de conexiones optimizado.
- **Socket.IO**: Comunicación bi-direccional para estadísticas en tiempo real.
- **Nodemailer**: Motor de notificaciones automáticas por email.
- **Swagger**: Documentación interactiva de la API en `/api-docs`.

### **Frontend (Experiencia de Usuario)**
- **Vanilla JS (ES6+)**: Lógica modular sin frameworks pesados para máxima velocidad.
- **CSS3 (Glassmorphism)**: Diseño premium con transparencias, gradientes y temas (Oscuro/Claro).
- **Chart.js**: Visualización de datos y tráfico de accesos.
- **html5-qrcode**: Escaneo de códigos QR directamente desde el navegador (HTTPS).

### **Infraestructura (Deployment)**
- **Docker & Docker Compose**: Contenedores para API, Base de Datos y Reverse Proxy.
- **Nginx**: Actúa como escudo frontal (SSL, Compresión Gzip, Seguridad).
- **Certbot/Let's Encrypt**: Gestión automática de certificados SSL.

---

## 3. 🛡️ MATRIZ DE SEGURIDAD (HARDENING)

El sistema implementa una estrategia de **Defensa en Profundidad**:

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **HTTP Headers** | Helmet.js | Previene XSS, Clickjacking y ataques de intermediario (HSTS). |
| **Autenticación** | JWT + MFA | Token firmado por el servidor + 2FA vía Google Authenticator. |
| **Contraseñas** | Bcrypt (Salt 10) | Hashing irreversible de credenciales. |
| **Control de Tráfico**| Rate Limiting | Bloquea IPs que intentan fuerza bruta. |
| **Validación** | express-validator| Asegura que solo entren datos limpios al servidor. |
| **Auditoría** | logs_sistema | Registro inmutable de acciones administrativas con IP. |
| **Inyección** | Prepared Statements| Evita SQL Injection al parametrizar las consultas. |

---

## 4. 🗄️ MODELO DE DATOS (BASE DE DATOS)

El esquema cuenta con 9 tablas principales relacionadas:

1.  **usuarios**: Maestro de personas, fotos, roles y secretos MFA.
2.  **roles**: Permisos (1: Admin, 2: Usuario, 3: Seguridad).
3.  **estados**: Diccionario de estados (Activo, Bloqueado, etc.).
4.  **clientes**: Empresas o unidades residenciales vinculadas.
5.  **medios_transporte**: Categorías (Coche, Moto, Peatón).
6.  **dispositivos**: Vehículos o equipos tecnológicos asignados a usuarios.
7.  **accesos**: Log histórico de entradas y salidas.
8.  **recovery_codes**: Códigos temporales de 6 dígitos para reset de clave.
9.  **logs_sistema**: Bitácora inmutable para auditoría administrativa.

---

## 5. 🔄 FLUJOS OPERATIVOS CLAVE

### **A. Registro y Bienvenida**
1. Admin registra usuario -> Email de bienvenida automático -> Usuario activa MFA.

### **B. Acceso vía Código QR**
1. Generación de QR (basado en UID del usuario).
2. Escaneo en portería -> Validación JWT/UID -> Registro en `accesos`.
3. Notificación vía Socket.IO -> Dashboard se actualiza en < 100ms.

### **C. Recuperación de Cuenta**
1. Solicitud email -> Generación código 6 dígitos (15 min exp) -> Envío SMTP.
2. Validación de código -> Hash de nueva clave -> Notificación de seguridad.

---

## 6. 📂 GUÍA DE ARCHIVOS PARA ESTUDIO

Para entender el proyecto, revisa estos archivos en orden:
1.  **`backend/server.js`**: El punto de arranque.
2.  **`backend/src/app.js`**: La configuración de seguridad y rutas.
3.  **`backend/src/controllers/auth.controller.js`**: La lógica más compleja (Login, MFA).
4.  **`backend/src/middleware/ipBlocker.js`**: Cómo se defiende el sistema solito.
5.  **`frontend/js/api.js`**: Cómo el front habla con el back de forma segura.
6.  **`frontend/css/index.css`**: Cómo se construyeron los temas dinámicos.

---

## 🚀 CONCLUSIÓN PARA MAPAS MENTALES
Passly representa el equilibrio perfecto entre **Usabilidad** (QR, Dashboard, Móvil) y **Seguridad Corporativa** (MFA, Auditoría, Hardening). Es un sistema escalable cuya documentación y comentarios lo hacen ideal para ser escalado a nivel comercial.

**"Passly: Seguridad en cada acceso, transparencia en cada log."** 🔐✨
