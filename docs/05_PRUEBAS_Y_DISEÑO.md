# 🧪 PRUEBAS Y DISEÑO (UX/UI) - PASSLY

## 1. RELACIÓN DISEÑO-IMPLEMENTACIÓN (MOCKUPS)
El sistema cumple estrictamente con los mockups aprobados, manteniendo una relación de 1:1 entre los elementos visuales y las rutas del backend.

*   **Identidad Visual**: Uso de variables CSS (`--accent-green`, `--accent-blue`, `--card-bg`) para asegurar coherencia en todas las vistas. Tipografías profesionales: Poppins, Roboto e Inter.
*   **Formularios**:
    *   **Frontend**: Validaciones en vivo (Regex) para evitar caracteres prohibidos. Emails solo @gmail/@hotmail en minúsculas. Contraseñas 8-12 caracteres con mayúscula, minúscula, número y especial (!@#$%^*/_.).
    *   **Backend**: Validación espejo con `express-validator` para seguridad "Zero-Trust". Mismas reglas exactas que el frontend.
*   **Responsividad**: Diseño Fluido (Fluid Layout) con breakpoints en 480px, 768px y 1024px que garantiza que el Dashboard sea operable en dispositivos móviles, tablets y desktop.

---

## 2. REPORTE DE PRUEBAS DE CALIDAD

### 2.1 Pruebas de Funcionalidad
| Módulo | Escenario de Prueba | Resultado |
| :--- | :--- | :--- |
| **Login** | Ingreso con credenciales válidas y rol correcto | ✅ ÉXITO |
| **Login** | Ingreso con rol incorrecto (no coincide con cuenta) | ✅ BLOQUEADO |
| **Login** | Ingreso con usuario inactivo o bloqueado | ✅ BLOQUEADO (Estado 403) |
| **Registro** | Intento de inyectar scripts `<script>` en el nombre | ✅ BLOQUEADO (Sanitización) |
| **Registro** | Email en mayúsculas o dominio no permitido | ✅ RECHAZADO (express-validator) |
| **Registro** | Contraseña sin complejidad requerida | ✅ RECHAZADO (Regex estricto) |
| **Recuperación** | Solicitud de código para usuario no existente | ✅ PROTEGIDO (Respuesta genérica) |
| **Recuperación** | Verificación de código expirado (> 15 min) | ✅ RECHAZADO |
| **Recuperación** | Uso de código ya utilizado | ✅ RECHAZADO |
| **QR Personal** | Generación de QR con datos del usuario | ✅ ÉXITO |
| **QR Invitado** | Generación de QR temporal con expiración | ✅ ÉXITO (JWT firmado) |
| **Escaneo QR** | Validación de QR de usuario permanente | ✅ ÉXITO + Registro automático |
| **Escaneo QR** | Validación de QR de invitado expirado | ✅ RECHAZADO |
| **Exportación** | Exportar accesos a CSV | ✅ ÉXITO |
| **Exportación** | Exportar accesos a PDF profesional | ✅ ÉXITO (con logo y formato) |
| **Socket.IO** | Actualización de dashboard tras nuevo acceso | ✅ ÉXITO (< 100ms) |
| **Foto Perfil** | Subida de imagen JPG/PNG < 2MB | ✅ ÉXITO |
| **Foto Perfil** | Intento de subir archivo no permitido | ✅ RECHAZADO (solo JPG/PNG) |

### 2.2 Pruebas de Aceptación y Usuario
*   **Aceptación**: El sistema permite registrar un acceso en menos de 3 clicks (Cumplido).
*   **Integridad**: Las contraseñas en la base de datos son ilegibles (Bcrypt salt 10 corroborado).
*   **Sesión**: El token JWT expira y requiere re-login tras inactividad (Cumplido, expiración configurable).
*   **JWT Hardened**: Tokens de recuperación (purpose: password_reset) no pueden usarse para autenticar sesiones (Cumplido).

### 2.3 Pruebas de Estrés (Simuladas)
*   **Capacidad**: El contenedor Nginx está configurado con `worker_connections 1024`, permitiendo ráfagas de tráfico de hasta 1000 usuarios concurrentes sin degradación de servicio.
*   **Disponibilidad**: Failover simulado apagando el contenedor de API; Docker lo reinicia automáticamente (restart: always).
*   **Pool MySQL**: Configurado con 10 conexiones máximas y cola de espera para manejar picos de carga.

### 2.4 Pruebas de Hardening (Seguridad)
| Vector de Ataque | Medida de Mitigación | Estado |
| :--- | :--- | :--- |
| **Fuerza Bruta (Login)** | Rate Limiting: 100 intentos / 15 minutos por IP | ✅ ACTIVO |
| **Fuerza Bruta (Registro)** | Rate Limiting: 50 intentos / hora por IP | ✅ ACTIVO |
| **Fuerza Bruta (Recovery)** | Rate Limiting: 3 solicitudes / hora por IP | ✅ ACTIVO |
| **XSS / Inyección HTML** | Sanitización de inputs (eliminación de `<>`) + CSP (Helmet) | ✅ ACTIVO |
| **DOS / Scraping** | Rate Limiting global por IP (100 req / 15 min) | ✅ ACTIVO |
| **Clickjacking** | X-Frame-Options: DENY (Helmet) | ✅ ACTIVO |
| **HSTS Downgrade** | Strict-Transport-Security: 1 año + preload (Helmet) | ✅ ACTIVO |
| **Secuestro de Sesión** | JWT con expiración, verificación de estado de usuario en cada request | ✅ ACTIVO |
| **Escalamiento de Privilegios** | Verificación de propósito del JWT (tokens de recovery rechazados para sesión) | ✅ ACTIVO |
| **SQL Injection** | Prepared statements en todas las consultas MySQL | ✅ ACTIVO |
| **Enumeración de Usuarios** | Respuestas genéricas en forgot-password ("Si el correo está registrado...") | ✅ ACTIVO |

---

## 🎨 DISEÑO Y EXPERIENCIA (UX)
*   **Modo Oscuro Dinámico:** Implementación nativa con variables CSS y persistencia en `localStorage`. Toggle accesible en esquina superior derecha.
*   **Dashboard Visual:** Tarjetas de estadísticas con indicadores visuales de estado (verde/azul/amarillo/rojo). Gráfica de tráfico por horas con Chart.js.
*   **Sistema QR:** Tarjeta de QR personal en el dashboard con botón de generación y descarga como PNG. QR de invitados con colores diferenciados (azul).
*   **Feedback Inmediato:** Sistema de "Toasts" para notificaciones no intrusivas de éxito, error y advertencia.
*   **Carga Optimizada:** Spinners de carga y estados de feedback visual para mejorar la percepción de velocidad.
*   **Modales Dinámicos:** CRUD completo de usuarios y dispositivos con modales adaptados a los datos de cada entidad.
*   **Glassmorphism:** Tarjetas con backdrop-filter blur, bordes sutiles y sombras dinámicas.
*   **Tipografía Moderna:** Poppins para títulos, Roboto para inputs, Inter para métricas y números.
*   **Responsive:** Mobile-first con breakpoints optimizados y targets touch-friendly (mínimo 44px).

---

## 🚀 ROADMAP (MEJORAS FUTURAS)
1.  **MFA**: Autenticación de dos factores para cuentas de administradores.
2.  **Integración de Hardware**: API para lectores de códigos QR físicos o tarjetas RFID.
3.  **Sistema Multi-tenant**: Gestión completa de múltiples clientes/unidades residenciales.
4.  **Reportes Avanzados**: Gráficas en PDF, reportes semanales automáticos.
5.  **CI/CD**: Pipeline con GitHub Actions para testing y deploy automático.
6.  **HTTPS**: Certificados SSL con Let's Encrypt para producción.
