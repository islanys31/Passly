# 📊 DIAGRAMAS TÉCNICOS DEL SISTEMA - PASSLY

## 1. DIAGRAMA DE CASOS DE USO
Representa las interacciones de los actores con el sistema.

```mermaid
useCaseDiagram
    actor "Administrador" as Admin
    actor "Usuario/Empleado" as User
    actor "Seguridad" as Guard

    package "Sistema Passly" {
        usecase "Gestionar Usuarios/Roles" as UC1
        usecase "Registrar Dispositivo" as UC2
        usecase "Registrar Acceso" as UC3
        usecase "Ver Dashboard/Estadísticas" as UC4
        usecase "Recuperar Contraseña" as UC5
        usecase "Generar QR Personal" as UC6
        usecase "Crear Invitación QR" as UC7
        usecase "Escanear QR" as UC8
        usecase "Exportar Reportes" as UC9
        usecase "Subir Foto de Perfil" as UC10
    }

    Admin --> UC1
    Admin --> UC2
    Admin --> UC4
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    User --> UC5
    User --> UC6
    User --> UC10
    Guard --> UC3
    Guard --> UC4
    Guard --> UC8
```

---

## 2. DIAGRAMA DE CLASES (MODELO MVC)
Estructura lógica del backend y sus relaciones.

```mermaid
classDiagram
    class Usuario {
        +int id
        +string nombre
        +string apellido
        +string email
        +string password
        +int rol_id
        +int cliente_id
        +int estado_id
        +string foto_url
        +login()
        +register()
        +resetPassword()
        +uploadPhoto()
    }
    class Dispositivo {
        +int id
        +string nombre
        +string identificador_unico
        +int medio_transporte_id
        +int usuario_id
        +int estado_id
    }
    class Acceso {
        +int id
        +dateTime fecha_hora
        +enum tipo
        +string observaciones
        +int usuario_id
        +int dispositivo_id
    }
    class RecoveryCode {
        +int id
        +string email
        +string code
        +dateTime expires_at
        +boolean used
    }
    class AuthController {
        +register()
        +login()
        +forgotPassword()
        +resetPassword()
    }
    class AccessController {
        +getAllAccess()
        +logAccess()
        +generateAccessQR()
        +createGuestInvitation()
        +validateScan()
    }
    class StatsController {
        +getGeneralStats()
    }
    class SecurityMiddleware {
        +helmetConfig()
        +loginLimiter()
        +registerLimiter()
        +forgotPasswordLimiter()
        +validateRegister()
        +validateLogin()
        +sanitizeInput()
    }

    Usuario "1" -- "0..*" Dispositivo : posee
    Usuario "1" -- "0..*" Acceso : realiza
    Dispositivo "0..1" -- "0..*" Acceso : vinculado_a
    Usuario "1" -- "0..*" RecoveryCode : solicita
    AuthController ..> Usuario : gestiona
    AccessController ..> Acceso : registra
    SecurityMiddleware ..> AuthController : protege
```

---

## 3. DIAGRAMA DE DESPLIEGUE (DOCKER)
Arquitectura física y red.

```mermaid
graph TD
    Client[Navegador del Usuario] -- "Puerto 80/443" --> Nginx[Contenedor Nginx Proxy]
    Nginx -- "Proxy Pass /api (Red Interna)" --> API[Contenedor Node.js API]
    Nginx -- "Proxy Pass /socket.io" --> API
    API -- "TCP 3306" --> DB[Contenedor MySQL 8.0]
    API -- "WebSockets (Socket.IO)" --> Client
    subgraph "Docker Network (passly-network)"
        Nginx
        API
        DB
    end
    subgraph "Componentes API"
        API --> Helmet[Helmet.js]
        API --> RateLimit[Rate Limiting]
        API --> JWT[JWT Auth]
        API --> SocketIO[Socket.IO]
        API --> Nodemailer[Email Service]
        API --> QRCode[QR Generator]
    end
```

---

## 4. DIAGRAMA DE ACTIVIDADES (REGISTRO DE ACCESO)
Flujo lógico del proceso principal.

```mermaid
flowchart TD
    A[Inicio] --> B{Método de Acceso}
    B -->|Manual| C[Seleccionar Usuario]
    B -->|QR Personal| D[Escanear QR con Cámara]
    B -->|QR Invitado| E[Escanear QR Temporal]
    
    C --> F[Seleccionar Dispositivo / Peatonal]
    F --> G[Seleccionar Tipo: Entrada/Salida]
    G --> H{Datos Completos?}
    H -->|Sí| I[API Valida Token JWT]
    H -->|No| J[Mostrar Error de Validación]
    J --> C
    
    D --> K[Backend Parsea JSON QR]
    K --> L{Usuario Activo?}
    L -->|Sí| I
    L -->|No| M[Error: Usuario Inactivo]
    
    E --> N[Backend Verifica JWT del QR]
    N --> O{Token Válido y No Expirado?}
    O -->|Sí| I
    O -->|No| P[Error: QR Inválido o Expirado]
    
    I --> Q[Registrar en BD]
    Q --> R[Emitir Evento Socket.IO]
    R --> S[Dashboard se Actualiza en Tiempo Real]
    S --> T[Fin]
```

---

## 5. DIAGRAMA DE ACTIVIDADES (RECUPERACIÓN DE CONTRASEÑA)
Flujo del proceso de recuperación.

```mermaid
flowchart TD
    A[Usuario Olvida Contraseña] --> B[Ingresa Email en forgot.html]
    B --> C[POST /api/auth/forgot-password]
    C --> D{Email Existe en BD?}
    D -->|No| E[Respuesta Genérica por Seguridad]
    D -->|Sí| F[Generar Código 6 Dígitos]
    F --> G[Guardar en recovery_codes con Expiración 15min]
    G --> H[Enviar Email con Nodemailer]
    H --> I[Usuario Recibe Código]
    I --> J[Ingresa Código en reset.html]
    J --> K[POST /api/auth/reset-password]
    K --> L{Código Válido y No Expirado?}
    L -->|No| M[Error: Código Inválido]
    L -->|Sí| N[Hash Nueva Contraseña con Bcrypt]
    N --> O[Actualizar en BD]
    O --> P[Enviar Email de Confirmación]
    P --> Q[Redirigir a Login]
```
