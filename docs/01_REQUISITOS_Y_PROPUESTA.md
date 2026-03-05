# 📄 EXPEDIENTE DE REQUISITOS Y PROPUESTA TÉCNICA - PASSLY

## 1. LEVANTAMIENTO DE REQUISITOS

### 1.1 Requisitos Funcionales (RF)
*   **RF-01: Gestión de Identidad**: El sistema debe permitir el registro (con email de bienvenida), login, autenticación de dos factores (MFA/2FA) vía TOTP y recuperación de contraseña de usuarios mediante códigos de verificación enviados por email.
*   **RF-10: Notificaciones por Email**: Envío automático de invitaciones a huéspedes y alertas de seguridad por cambios en la cuenta (MFA activado).
*   **RF-11: Auditoría de Sistema**: Registro automático de acciones administrativas críticas con IP y marca de tiempo.
*   **RF-02: Control de Dispositivos**: Los administradores deben poder registrar y asignar medios de transporte (vehículos, motocicletas, bicicletas) a usuarios.
*   **RF-03: Registro de Accesos**: Captura en tiempo real de entradas y salidas con marca de tiempo, observaciones y notificación vía WebSockets.
*   **RF-04: Dashboard de Estadísticas**: Visualización dinámica de usuarios activos, dispositivos, accesos del día y alertas de seguridad con gráficas de tráfico por horas.
*   **RF-05: Notificaciones Live**: El sistema debe alertar al administrador instantáneamente cuando ocurra un acceso mediante Socket.IO.
*   **RF-06: Sistema QR**: Generación de códigos QR personales para usuarios permanentes y QR temporales firmados con JWT para invitados con expiración configurable.
*   **RF-07: Escáner QR**: Validación automática de accesos mediante escaneo de QR con cámara o imagen.
*   **RF-08: Exportación de Reportes**: Generación de reportes en formato CSV (para Excel) y PDF profesional con logo y formato corporativo.
*   **RF-09: Gestión de Fotos**: Subida de fotos de perfil para identificación visual de usuarios (JPG/PNG, máximo 2MB).
*   **RF-12: Eliminación Lógica de Usuarios**: Capacidad de dar de baja o eliminar usuarios de forma lógica (cambio de estado), registrando la acción en sistema sin perder la integridad de datos históricos.
*   **RF-13: Ficha Maestra de Usuario**: Vista consolidada donde el administrador puede visualizar el resumen completo de un usuario, incluyendo sus dispositivos vehiculares, tecnológicos y últimos movimientos en el sistema.

### 1.2 Requisitos No Funcionales (RNF)
*   **RNF-01: Seguridad (Hardening)**: Encriptación con Bcrypt (salt 10), protección de headers con Helmet.js (CSP, HSTS), Rate Limiting por endpoint, sanitización de inputs, autenticación de dos factores (MFA/TOTP) y validaciones estrictas con express-validator.
*   **RNF-02: Disponibilidad**: Despliegue en contenedores Docker con restart automático y Nginx como reverse proxy.
*   **RNF-03: Desempeño**: Respuestas optimizadas con Gzip (compression middleware + Nginx), caché de assets (7 días + ETags), latencia < 400ms.
*   **RNF-04: Escalabilidad**: Arquitectura MVC orientada a servicios con pool de conexiones MySQL (10 conexiones), WebSockets para tiempo real.
*   **RNF-05: Responsividad**: Interfaz adaptativa con diseño Mobile-First que se ajusta a móviles, tablets y escritorio.

---

## 2. PROPUESTA TÉCNICA Y ARQUITECTURA

### 2.1 Arquitectura del Sistema
Se utiliza el patrón **MVC (Modelo-Vista-Controlador)** desacoplado:
*   **Modelo**: MySQL 8.0 gestionando la persistencia, relaciones con FKs y normalización 3FN.
*   **Controlador**: Express.js manejando la lógica de rutas, validaciones (express-validator) y middlewares de seguridad.
*   **Vista**: Frontend SPA (Single Page Application) con Vanilla JS, CSS moderno (Glassmorphism, temas) y librerías especializadas (Chart.js, jsPDF, QRCode.js).

### 2.2 Framework y Herramientas
*   **Backend**: Node.js v18+ con Express, Socket.IO, Helmet.js, express-rate-limit.
*   **Seguridad**: JWT (JSON Web Tokens) para sesiones stateless, Bcrypt para hash de passwords, express-validator para validaciones.
*   **Tiempo Real**: Socket.IO para notificaciones y actualizaciones live del dashboard.
*   **Email**: Nodemailer con Gmail para recuperación de contraseña.
*   **QR**: QRCode (backend) para generación, html5-qrcode (frontend) para escaneo.
*   **Reportes**: jsPDF para PDF profesional, exportación nativa a CSV.
*   **Documentación**: Swagger (swagger-jsdoc + swagger-ui-express) en `/api-docs`.
*   **Infraestructura**: Docker Compose con Nginx reverse proxy para producción.

---

## 3. MODELO DE DOMINIO
El dominio se centra en la triada **Usuario ↔ Dispositivo ↔ Acceso**. 
*   Un **Usuario** puede poseer N **Dispositivos** (vehículos, bicicletas, etc.).
*   Un **Acceso** puede estar vinculado a un **Usuario** (Peatonal) o a un **Dispositivo** (Vehicular).
*   El **Cliente** (Empresa/Unidad Residencial) agrupa a los usuarios.
*   Los **Roles** (Admin, Usuario, Seguridad) definen los permisos en el sistema.
*   Los **Estados** (Activo, Inactivo, Mantenimiento, Bloqueado) controlan la disponibilidad de cada entidad.
*   **Códigos de Recuperación**: Permiten restablecer contraseñas mediante verificación por email con expiración de 15 minutos.
*   **Logs de Sistema**: Registro inmutable de cada acción administrativa para cumplir con estándares de auditoría.
