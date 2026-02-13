# 📄 EXPEDIENTE DE REQUISITOS Y PROPUESTA TÉCNICA - PASSLY

## 1. LEVANTAMIENTO DE REQUISITOS

### 1.1 Requisitos Funcionales (RF)
*   **RF-01: Gestión de Identidad**: El sistema debe permitir el registro, login y recuperación de contraseña de usuarios.
*   **RF-02: Control de Dispositivos**: Los administradores deben poder registrar y asignar medios de transporte (vehículos, bicicletas) a usuarios.
*   **RF-03: Registro de Accesos**: Captura en tiempo real de entradas y salidas con marca de tiempo y observaciones.
*   **RF-04: Dashboard de Estadísticas**: Visualización dinámica de usuarios activos, dispositivos y alertas de seguridad.
*   **RF-05: Notificaciones Live**: El sistema debe alertar al administrador instantáneamente cuando ocurra un acceso.

### 1.2 Requisitos No Funcionales (RNF)
*   **RNF-01: Seguridad (Hardening)**: Encriptación de contraseñas con Bcrypt y protección de headers con Helmet.
*   **RNF-02: Disponibilidad**: Despliegue en contenedores Docker para asegurar que los servicios se reinicien automáticamente.
*   **RNF-03: Desempeño**: Respuestas de Nginx optimizadas con Gzip (latencia < 500ms).
*   **RNF-04: Escalabilidad**: Arquitectura orientada a servicios (API separada de la BD).
*   **RNF-05: Responsividad**: Interfaz sensible que se adapta a móviles, tablets y escritorio.

---

## 2. PROPUESTA TÉCNICA Y ARQUITECTURA

### 2.1 Arquitectura del Sistema
Se utiliza el patrón **MVC (Modelo-Vista-Controlador)** desacoplado:
*   **Modelo**: MySQL 8.0 gestionando la persistencia y relaciones.
*   **Controlador**: Express.js manejando la lógica de rutas y validaciones.
*   **Vista**: Frontend SPA (Single Page Application) con Vanilla JS y CSS Moderno.

### 2.2 Framework y Herramientas
*   **Backend**: Node.js v18+ con Express.
*   **Seguridad**: JWT (JSON Web Tokens) para sesiones sin estado.
*   **Infraestructura**: Nginx como Reverse Proxy para terminación SSL y balanceo.

---

## 3. MODELO DE DOMINIO
El dominio se centra en la triada **Usuario ↔ Dispositivo ↔ Acceso**. 
*   Un **Usuario** puede poseer N **Dispositivos**.
*   Un **Acceso** puede estar vinculado a un **Usuario** (Peatonal) o a un **Dispositivo** (Vehicular).
*   El **Cliente** (Empresa) agrupa a los usuarios en un entorno multi-inquilino.
