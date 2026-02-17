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
    }

    Admin --> UC1
    Admin --> UC2
    Admin --> UC4
    User --> UC5
    Guard --> UC3
    Guard --> UC4
```

---

## 2. DIAGRAMA DE CLASES (MODELO MVC)
Estructura lógica del backend y sus relaciones.

```mermaid
classDiagram
    class Usuario {
        +int id
        +string nombre
        +string email
        +string password
        +int rol_id
        +login()
        +resetPassword()
    }
    class Dispositivo {
        +int id
        +string nombre
        +string identificador_unico
        +int medio_transporte_id
    }
    class Acceso {
        +int id
        +dateTime fecha_hora
        +enum tipo
        +string observaciones
    }
    class Controller {
        +getAllStats()
        +registerAccess()
    }

    Usuario "1" -- "0..*" Dispositivo : posee
    Usuario "1" -- "0..*" Acceso : realiza
    Dispositivo "0..1" -- "0..*" Acceso : vinculado_a
    Controller ..> Usuario : gestiona
```

---

## 3. DIAGRAMA DE DESPLIEGUE (DOCKER)
Arquitectura física y red.

```mermaid
graph TD
    Client[Navegador del Usuario] -- "Puerto 80/443" --> Nginx[Contenedor Nginx Proxy]
    Nginx -- "Proxy Pass (Red Interna)" --> API[Contenedor Node.js API]
    API -- "TCP 3306" --> DB[Contenedor MySQL]
    API -- "WebSockets" --> Client
    subgraph "Docker Network"
        Nginx
        API
        DB
    end
```

---

## 4. DIAGRAMA DE ACTIVIDADES (REGISTRO DE ACCESO)
Flujo lógico del proceso principal.

```mermaid
activityDiagram
    start
    :Seguridad selecciona Usuario;
    :Selecciona Dispositivo (o Peatonal);
    if (Datos completos?) then (si)
        :API valida Token;
        :Registra en BD;
        :Emite evento Socket.io;
        :Dashboard se actualiza;
        stop
    else (no)
        :Muestra error de validación;
        stop
    endif
```
