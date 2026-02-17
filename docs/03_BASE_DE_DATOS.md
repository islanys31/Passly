# 🗄️ MODELO DE BASE DE DATOS - PASSLY

## 1. MODELO ENTIDAD-RELACIÓN (MER)
El diseño se basa en una arquitectura relacional sólida con llaves foráneas para integridad referencial.

*   **ESTADOS**: Diccionario de estados del sistema (Activo, Inactivo, Mantenimiento, Bloqueado).
*   **CLIENTES**: Entidades empresariales o unidades residenciales.
*   **ROLES**: Definición de permisos (Admin, Usuario, Seguridad).
*   **USUARIOS**: Maestro de personas con credenciales encriptadas (Bcrypt) y foto de perfil.
*   **MEDIOS_TRANSPORTE**: Catálogo de medios (Vehículo Particular, Motocicleta, Bicicleta, Peatonal).
*   **DISPOSITIVOS**: Bienes muebles asignados a usuarios con identificador único.
*   **ACCESOS**: Log histórico de movimientos (Entrada/Salida) con marca de tiempo.
*   **RECOVERY_CODES**: Códigos de recuperación de contraseña con expiración de 15 minutos.

---

## 2. NORMALIZACIÓN (3FN)

### 2.1 Primera Forma Normal (1FN)
*   Cada columna contiene valores atómicos (ej. Nombre y Apellido están separados).
*   No hay grupos repetitivos. Cada registro tiene un ID único auto-incremental.

### 2.2 Segunda Forma Normal (2FN)
*   Cumple con 1FN.
*   Todas las columnas no llave dependen totalmente de la llave primaria. (Ej: La descripción del rol no depende del usuario, sino de la tabla `roles`).

### 2.3 Tercera Forma Normal (3FN)
*   Cumple con 2FN.
*   No existen dependencias transitivas. Las descripciones de estados y medios de transporte se movieron a sus propias tablas (`estados`, `medios_transporte`) para evitar que cambios en una entidad afecten a todo el log.

---

## 3. ESQUEMA DE TABLAS

### 3.1 Tabla `estados`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| nombre | VARCHAR(50) | NOT NULL |
| descripcion | VARCHAR(255) | DEFAULT NULL |

**Datos iniciales:** Activo, Inactivo, Mantenimiento, Bloqueado.

### 3.2 Tabla `clientes`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| nombre_cliente | VARCHAR(100) | NOT NULL |
| contacto_email | VARCHAR(100) | DEFAULT NULL |
| estado_id | INT | FK → estados(id), DEFAULT 1 |
| created_at | TIMESTAMP | AUTO |
| updated_at | TIMESTAMP | AUTO ON UPDATE |

### 3.3 Tabla `roles`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| nombre_rol | VARCHAR(50) | NOT NULL |
| descripcion | VARCHAR(255) | DEFAULT NULL |

**Datos iniciales:** Admin, Usuario, Seguridad.

### 3.4 Tabla `usuarios`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| nombre | VARCHAR(50) | NOT NULL |
| apellido | VARCHAR(50) | NOT NULL |
| email | VARCHAR(100) | NOT NULL, **UNIQUE** |
| password | VARCHAR(255) | NOT NULL (Bcrypt hash) |
| cliente_id | INT | FK → clientes(id), NULLABLE |
| rol_id | INT | FK → roles(id), NOT NULL |
| estado_id | INT | FK → estados(id), DEFAULT 1 |
| foto_url | VARCHAR(255) | DEFAULT NULL |
| created_at | TIMESTAMP | AUTO |
| updated_at | TIMESTAMP | AUTO ON UPDATE |

### 3.5 Tabla `medios_transporte`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| nombre | VARCHAR(50) | NOT NULL |
| descripcion | VARCHAR(255) | DEFAULT NULL |
| estado_id | INT | FK → estados(id), DEFAULT 1 |

**Datos iniciales:** Vehículo Particular, Motocicleta, Bicicleta, Peatonal.

### 3.6 Tabla `dispositivos`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| usuario_id | INT | FK → usuarios(id), NOT NULL |
| medio_transporte_id | INT | FK → medios_transporte(id), NOT NULL |
| nombre | VARCHAR(100) | NOT NULL |
| identificador_unico | VARCHAR(100) | NOT NULL |
| estado_id | INT | FK → estados(id), DEFAULT 1 |
| created_at | TIMESTAMP | AUTO |
| updated_at | TIMESTAMP | AUTO ON UPDATE |

### 3.7 Tabla `accesos`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| usuario_id | INT | FK → usuarios(id), NOT NULL |
| dispositivo_id | INT | FK → dispositivos(id), NULLABLE |
| tipo | ENUM('Entrada','Salida') | NOT NULL |
| observaciones | VARCHAR(255) | DEFAULT NULL |
| fecha_hora | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### 3.8 Tabla `recovery_codes`
| Campo | Tipo | Restricción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | PRIMARY KEY |
| email | VARCHAR(100) | NOT NULL |
| code | VARCHAR(6) | NOT NULL |
| expires_at | DATETIME | NOT NULL (15 min desde creación) |
| used | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

## 4. RESTRICCIONES DE INTEGRIDAD

*El script completo se encuentra en `/database/passly.sql`.*

### Principales Restricciones:
*   **ON DELETE RESTRICT**: Evita borrar un usuario que tiene historial de accesos.
*   **UNIQUE (email)**: Garantiza que no existan cuentas duplicadas.
*   **ENUM (tipo)**: Restringe el acceso solo a 'Entrada' o 'Salida' a nivel de motor de base de datos.
*   **SOFT DELETE**: Los usuarios y dispositivos no se eliminan, su `estado_id` se cambia a 2 (Inactivo).
*   **AUTO_INCREMENT**: Todos los IDs primarios son auto-incrementales.
*   **TIMESTAMPS**: `created_at` y `updated_at` se gestionan automáticamente por MySQL.

### Relaciones (FKs):
*   `clientes.estado_id` → `estados.id`
*   `usuarios.cliente_id` → `clientes.id`
*   `usuarios.rol_id` → `roles.id`
*   `usuarios.estado_id` → `estados.id`
*   `medios_transporte.estado_id` → `estados.id`
*   `dispositivos.usuario_id` → `usuarios.id`
*   `dispositivos.medio_transporte_id` → `medios_transporte.id`
*   `dispositivos.estado_id` → `estados.id`
*   `accesos.usuario_id` → `usuarios.id`
*   `accesos.dispositivo_id` → `dispositivos.id`
