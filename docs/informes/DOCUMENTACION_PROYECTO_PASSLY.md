# 📄 DOCUMENTACIÓN ESTRATÉGICA Y TÉCNICA: PROYECTO PASSLY

## 1. Título del Proyecto
**Passly:** Sistema Integral de Gestión y Control de Accesos con Monitoreo en Tiempo Real y Hardening de Seguridad.  
*Descripción:* Plataforma web robusta diseñada para centralizar, asegurar y automatizar el registro de entrada y salida de personal, vehículos y dispositivos en entornos empresariales o residenciales.

## 2. Sector Productivo
**Sector Terciario:** Prestación de servicios de tecnología, seguridad digital y gestión de información.

## 3. Planteamiento del Problema a Resolver
*   **Manifestación:** Muchas organizaciones dependen de registros manuales (libretas físicas o Excels básicos) para controlar quién entra y sale. Esto genera colas en portería, pérdida de trazabilidad de dispositivos (laptops, vehículos) y una seguridad vulnerable a suplantaciones.
*   **Por qué:** Existe una brecha tecnológica entre la necesidad de seguridad y las herramientas actuales, que no ofrecen respuestas en tiempo real ni protección de datos moderna.
*   **Delimitación:** Basado en una arquitectura web (Node.js/MySQL) con entorno contenerizado (Docker), enfocado en el control de acceso peatonal y vehicular durante el primer trimestre de 2026.

## 4. Justificación
*   **Importancia:** La seguridad es la base de la operatividad; un fallo en el control de acceso puede comprometer activos físicos y digitales.
*   **Razón:** Para optimizar los tiempos de registro y garantizar que la información sea inalterable mediante técnicas de *Hardening* (Endurecimiento de seguridad).
*   **Aportes:** Un sistema capaz de notificar movimientos instantáneamente (WebSockets), con copias de seguridad automáticas y documentación técnica estandarizada (Swagger).
*   **Beneficiarios:** Empresas de seguridad, administradores de infraestructuras, personal de vigilancia y empleados.

## 5. OBJETIVOS

### Objetivo General
**Desarrollar** e **implementar** un sistema web integral de control de accesos mediante arquitectura MVC y tecnologías escalables para **optimizar** la seguridad y gestión de personal en entornos controlados bajo estándares de alta disponibilidad.

### Objetivos Específicos
1.  **Diseñar** una base de datos relacional normalizada y optimizada mediante índices para el manejo eficiente de grandes volúmenes de registros.
2.  **Implementar** una API REST robusta que integre protocolos de seguridad JWT, sanitización de entradas (XSS) y limitadores de tasa (Rate Limiting).
3.  **Construir** una interfaz de usuario dinámica con diseño premium (Glassmorphism) que visualice estadísticas y alertas en tiempo real vía WebSockets.
4.  **Configurar** un entorno de despliegue automatizado con Docker y scripts de backup programados para asegurar la continuidad del servicio.

## 6. Antecedentes
*   **Objetivo del trabajo:** Sistematizar de forma digital el flujo de logística de acceso.
*   **Módulos:** Login Seguro, Gestión de Usuarios, Registro de Dispositivos (Vehículos/Equipos), Logs de Acceso, Dashboard de Estadísticas.
*   **Resumen:** Passly evoluciona de un log de auditoría simple a una plataforma reactiva que permite a los supervisores ver quién ingresa en el mismo segundo en que sucede el evento.
*   **Relación:** Se basa en la transformación digital de procesos de seguridad física hacia la nube y el monitoreo remoto.

## 7. Resultados Esperados
*   **Tangible:** Aplicación web funcional instalable como PWA (Progressive Web App).
*   **Medible:** API documentada al 100% con Swagger; respuesta del servidor menor a 500ms.
*   **Verificable:** Reducción del 50% en el tiempo de procesamiento de ingresos en portería y 0 errores de duplicidad de registros en la BD.

## 8. Alcance
*   **Qué se va a hacer:** Desarrollo del Core (CRUD), Hardening de seguridad, Sistema de notificación real-time y Backups.
*   **Qué NO se va a hacer:** No incluye integración con hardware biométrico físico (escaneo de retina/iris) ni gestión de nómina salarial.
*   **Plazo:** 4 semanas de desarrollo intensivo (Finalización: Febrero 2026).
*   **Propiedad Intelectual:** Código fuente propiedad del desarrollador con licencia de uso exclusivo para la entidad implementadora.

---
*Generado automáticamente según los criterios de la guía de proyectos SENA/Industria.*
