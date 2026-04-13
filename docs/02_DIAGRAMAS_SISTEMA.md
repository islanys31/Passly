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
        usecase "Configurar MFA (2FA)" as UC11
        usecase "Ver Logs de Auditoría" as UC12
        usecase "Eliminar Usuario (Lógico)" as UC13
        usecase "Ver Ficha Maestra" as UC14
    }

    Admin --> UC1
    Admin --> UC2
    Admin --> UC4
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
    User --> UC11
    User --> UC5
    User --> UC6
    User --> UC10
    Guard --> UC3
    Guard --> UC4
    Guard --> UC8
    Guard --> UC14
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
        +boolean mfa_enabled
        +string mfa_secret
        +login()
        +register()
        +resetPassword()
        +uploadPhoto()
        +enableMFA()
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
    class LogAuditoria {
        +int id
        +int usuario_id
        +string accion
        +string modulo
        +string ip_address
    }
    class Equipo {
        +int id
        +int usuario_id
        +string nombre
        +string tipo
        +string serial
        +int estado_id
    }
    class AuthController {
        +register()
        +login()
        +mfaLogin()
        +mfaVerify()
        +magicLogin()
    }
    class UserController {
        +getAllUsers()
        +getUserById()
        +createUser()
        +updateUser()
        +deleteUser()
    }
    class AccessController {
        +getAllAccess()
        +logAccess()
        +generateAccessQR()
        +createGuestInvitation()
        +validateScan()
    }
    class EquipoController {
        +getAllEquipos()
        +createEquipo()
        +updateEquipo()
        +deleteEquipo()
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
    Usuario "1" -- "0..*" Equipo : posee
    Usuario "1" -- "0..*" Acceso : realiza
    Usuario "1" -- "0..*" LogAuditoria : genera
    Dispositivo "0..1" -- "0..*" Acceso : vinculado_a
    Usuario "1" -- "0..*" RecoveryCode : solicita
    AuthController ..> Usuario : gestiona
    AccessController ..> Acceso : registra
    EquipoController ..> Equipo : gestiona
    SecurityMiddleware ..> AuthController : protege
```

---

## 3. DIAGRAMA DE DESPLIEGUE (CLOUD EDITION)
Arquitectura distribuida en la nube.

```mermaid
graph TD
    Client[Navegador del Usuario] -- "HTTPS (Vercel Edge)" --> Front[Frontend SPA - Vercel]
    Front -- "Fetch API (REST)" --> Backend[API Node.js - Render]
    Backend -- "SSL / TCP 3306" --> DB[MySQL Cloud - Aiven]
    Backend -- "Socket.IO (WSS)" --> Client
    
    subgraph "Capas de Seguridad"
        Backend --> MFA[MFA Provider]
        Backend --> Audit[Audit Logger]
        Backend --> Helmet[Helmet.js]
        Backend --> RateLimit[Rate Limiting]
    end
    
    subgraph "Infraestructura CI/CD"
        Github[Repositorio GitHub] -- "Webhooks" --> Front
        Github -- "Build Docker" --> Backend
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

---

## 6. DIAGRAMA DE SECUENCIA (MAGIC LOGIN)
Acceso rápido para demostraciones sin credenciales.

```mermaid
sequenceDiagram
    participant U as Usuario/Demo
    participant F as Frontend
    participant B as Backend (MagicController)
    participant DB as MySQL/Memory

    U->>F: Acceder a /magic?role=Admin
    F->>B: GET /api/magic/login?role=1
    Note over B: Validar Modo Nuclear vs DB
    B->>DB: Buscar usuario del rol solicitado
    ALT Base de Datos OK
        DB-->>B: Retorna datos de usuario real
    ELSE Base de Datos Down
        B->>B: Inyectar Mock Data (Modo Nuclear)
    END
    B->>B: Generar JWT (Bearer Token)
    B->>F: Redirigir con JWT y Cookie HTTP-Only
    F->>F: Inicializar Dashboard en Modo Demo
    Note over F: WebSocket Autenticado
```

---

## 7. DIAGRAMA DE ESTADOS (CICLO DE VIDA USUARIO)
Control de estados y transiciones de seguridad.

```mermaid
stateDiagram-v2
    [*] --> Inactivo: Registro Inicial
    Inactivo --> Activo: Verificación de Email
    Activo --> Bloqueado: Exceso de Intentos Falal
    Bloqueado --> Activo: Reset de Contraseña
    Activo --> Mantenimiento: Acción Admin
    Mantenimiento --> Activo: Reapertura
    Activo --> Inactivo: Baja (Soft Delete)
```
