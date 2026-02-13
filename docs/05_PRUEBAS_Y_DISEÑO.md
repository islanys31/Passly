# 🧪 PRUEBAS Y DISEÑO (UX/UI) - PASSLY

## 1. RELACIÓN DISEÑO-IMPLEMENTACIÓN (MOCKUPS)
El sistema cumple estrictamente con los mockups aprobados, manteniendo una relación de 1:1 entre los elementos visuales y las rutas del backend.

*   **Identidad Visual**: Uso de variables CSS (`--accent-green`, `--card-bg`) para asegurar coherencia en todas las vistas.
*   **Formularios**:
    *   **Frontend**: Validaciones en vivo (Regex) para evitar caracteres prohibidos.
    *   **Backend**: Validación espejo con `express-validator` para seguridad "Zero-Trust".
*   **Responsividad**: Diseño Fluido (Fluid Layout) que garantiza que el Dashboard sea operable en una Tablet de seguridad en el sitio de acceso.

---

## 2. REPORTE DE PRUEBAS DE CALIDAD

### 2.1 Pruebas de Funcionalidad
| Módulo | Escenario de Prueba | Resultado |
| :--- | :--- | :--- |
| **Login** | Ingreso con credenciales válidas | ✅ ÉXITO |
| **Registro** | Intento de inyectar scripts `<script>` en el nombre | ✅ BLOQUEADO |
| **Recuperación** | Solicitud de token para usuario no existente | ✅ PROTEGIDO (Respuesta genérica) |
| **Socket.io** | Actualización de tabla tras nuevo acceso | ✅ ÉXITO (< 100ms) |

### 2.2 Pruebas de Aceptación y Usuario
*   **Aceptación**: El sistema permite registrar un acceso en menos de 3 clicks (Cumplido).
*   **Integridad**: Las contraseñas en la base de datos son ilegibles (Bcrypt corroborado).
*   **Sesión**: El token JWT expira y requiere re-login tras inactividad (Cumplido).

### 2.3 Pruebas de Estrés (Simuladas)
*   **Capacidad**: El contenedor Nginx está configurado con `worker_connections 1024`, permitiendo ráfagas de tráfico de hasta 1000 usuarios concurrentes sin degradación de servicio.
*   **Disponibilidad**: Failover simulado apagando el contenedor de API; Docker lo reinicia en menos de 5 segundos.

---

## 🚀 ROADMAP (MEJORAS FUTURAS)
1.  **Exportación a PDF/Word**: Generación de reportes semanales de accesos utilizando librerías como `jsPDF` o `Docx.js`.
2.  **MFA**: Authenticación de dos factores para cuentas de administradores.
3.  **Integración de Hardware**: API para lectores de códigos QR o tarjetas RFID.
