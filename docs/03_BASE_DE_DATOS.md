# 🗄️ MODELO DE BASE DE DATOS - PASSLY

## 1. MODELO ENTIDAD-RELACIÓN (MER)
El diseño se basa en una arquitectura relacional sólida con llaves foráneas para integridad referencial.

*   **USUARIOS**: Maestro de personas con credenciales encriptadas.
*   **ROLES**: Definición de permisos (Admin, Usuario, Seguridad).
*   **DISPOSITIVOS**: Bienes muebles asignados a usuarios.
*   **MEDIOS_TRANSPORTE**: Tipificación (Vehículo, Moto, Peatonal).
*   **ACCESOS**: Log histórico de movimientos.
*   **ESTADOS**: Diccionario de estados (Activo, Inactivo, Bloqueado).

---

## 2. NORMALIZACIÓN (3FN)

### 2.1 Primera Forma Normal (1FN)
*   Cada columna contiene valores atómicos (ej. Nombre y Apellido están separados).
*   No hay grupos repetitivos. Cada registro tiene un ID único.

### 2.2 Segunda Forma Normal (2FN)
*   Cumple con 1FN.
*   Todas las columnas no llave dependen totalmente de la llave primaria. (Ej: La descripción del rol no depende del usuario, sino de la tabla `roles`).

### 2.3 Tercera Forma Normal (3FN)
*   Cumple con 2FN.
*   No existen dependencias transitivas. Las descripciones de estados y medios de transporte se movieron a sus propias tablas (`estados`, `medios_transporte`) para evitar que cambios en una entidad afecten a todo el log.

---

## 3. ESQUEMA DE TABLAS (DDL)
*El script completo se encuentra en `/database/passly.sql`.*

### Principales Restricciones:
*   **ON DELETE RESTRICT**: Evita borrar un usuario que tiene historial de accesos.
*   **UNIQUE (email)**: Garantiza que no existan cuentas duplicadas.
*   **ENUM (tipo)**: Restringe el acceso solo a 'Entrada' o 'Salida' a nivel de motor de base de datos.
