# 🎓 GUÍA DE EXPOSICIÓN - PASSLY v3.0 (Cloud Edition)

## 📋 DATOS DEL PROYECTO
| Campo | Detalle |
|-------|---------|
| **Nombre** | Passly - Sistema de Control de Accesos Inteligente |
| **Versión** | 3.0 (Cloud Edition) |
| **Stack** | Node.js + Express + MySQL + Socket.IO |
| **Frontend** | Vanilla JS (SPA) con Glassmorphism |
| **Despliegue** | Render (API) + Vercel (Frontend) + Aiven (MySQL Cloud) |
| **Repositorio** | https://github.com/islanys31/Passly |

---

## 🌐 URLs EN VIVO
| Servicio | URL |
|----------|-----|
| 🖥️ **Frontend** | https://passly3106.vercel.app |
| ⚙️ **API Backend** | https://passly-69ah.onrender.com |
| 📘 **Swagger Docs** | https://passly-69ah.onrender.com/api-docs |

---

## 🔑 CREDENCIALES PARA LA DEMO
| Rol | Email | Contraseña |
|-----|-------|------------|
| **Administrador** | `admin@gmail.com` | `Passly@2025*` |
| **Usuario** | `juan.perez@passly.com` | `Passly@2025*` |
| **Seguridad** | `carlos.rod@passly.com` | `Passly@2025*` |

---

## 🎯 GUIÓN DE EXPOSICIÓN (Sugerencia ~20 min)

### Bloque 1: Introducción (3 min)
> *"Passly es un sistema de control de accesos que permite gestionar la entrada y salida de personas y vehículos en unidades residenciales, usando tecnología QR, autenticación MFA y monitoreo en tiempo real."*

**Puntos clave a mencionar:**
- **Problema:** Los conjuntos residenciales manejan el control de acceso de forma manual (cuadernos, porteros sin registro).
- **Solución:** Plataforma web que digitaliza todo el proceso con seguridad de nivel empresarial.
- **Alcance:** Funciona tanto para residentes permanentes como para invitados temporales.

### Bloque 2: Arquitectura Técnica (4 min)
> *Mostrar el diagrama de arquitectura del README o docs/02_DIAGRAMAS_SISTEMA.md*

**Explicar brevemente:**
- **Patrón MVC desacoplado:** El Frontend (Vercel) consume la API REST (Render) que se conecta a MySQL (Aiven).
- **3 capas de deploy independientes:** Si una cae, las otras siguen funcionando.
- **Tiempo Real:** Socket.IO mantiene el Dashboard actualizado sin recargar la página.
- **11 tablas relacionales** en 3ra Forma Normal con llaves foráneas e integridad referencial.

### Bloque 3: Demo en Vivo (10 min)

#### 3.1 - Login "Zero-Auth" (Magic Login)
1.  Explicar: *"Para esta demo, usaremos nuestra puerta trasera de seguridad para presentadores."*
2.  Navegar a: `https://passly-69ah.onrender.com/api/magic/login?role=1`
3.  Mostrar cómo el sistema entra al Dashboard de Administrador instantáneamente.
4.  **Mencionar el "Modo Nuclear"**: *"Si no hubiera internet o la base de datos cayera, el sistema inyecta identidades de emergencia para que la presentación nunca se detenga."*

#### 3.2 - Dashboard y Estadísticas
1.  Mostrar el Dashboard: Tarjetas de estadísticas, gráfica de tráfico, últimos accesos en tiempo real.
2.  Destacar los **WebSockets**: *"Cada entrada que ocurre en el recinto se refleja aquí en menos de 100ms."*

#### 3.2 - Gestión de Usuarios
1. Ir a **Identidades** en el menú lateral.
2. Mostrar la tabla paginada con búsqueda en tiempo real.
3. Crear un nuevo usuario (demostrar validaciones estrictas en nombre, email, contraseña).
4. Click en el botón de inspección (🔍) para mostrar la **Ficha Maestra** con dispositivos y últimos movimientos.

#### 3.3 - Sistema QR
1. En el Dashboard, hacer click en **"GENERAR LLAVE SEGURA"** para generar el QR personal.
2. Mostrar cómo se puede descargar como imagen PNG.
3. Ir a **Terminal QR** → se abre el escáner con la cámara.
4. *(Opcional)* Escanear un QR para mostrar el registro automático de acceso.

#### 3.4 - Seguridad MFA (2FA)
1. Ir a **Escudo 2FA** en el menú.
2. Click en **CONFIGURAR** → Se genera un código QR para Google Authenticator.
3. Explicar: *"Si activas esto, incluso si roban tu contraseña, necesitan tu teléfono para entrar."*

#### 3.5 - Exportación de Reportes
1. Ir a **Logs Colectivos** (Accesos).
2. Click en el botón de **CSV** → Descargar y abrir en Excel.
3. Click en el botón de **PDF** → Mostrar el reporte profesional con logo.

#### 3.6 - Modo Oscuro/Claro
1. En el sidebar, click en **MODO NOCHE** → Cambiar el tema visual en vivo.

### Bloque 4: Seguridad (Hardening) (3 min)
> *Referencia: docs/05_PRUEBAS_Y_DISEÑO.md*

**Mencionar las capas de protección:**
| Capa | Tecnología |
|------|-----------|
| Contraseñas | Bcrypt (hash irreversible, salt 10) |
| Sesiones | JWT con expiración + Cookies httpOnly |
| Headers HTTP | Helmet.js (CSP, HSTS, X-Frame-Options) |
| Fuerza Bruta | Rate Limiting (100 intentos/15min por IP) |
| Inyección SQL | Prepared Statements en todas las consultas |
| XSS | Sanitización automática de inputs |
| 2FA | TOTP con Google Authenticator |
| Auditoría | Logs inmutables de cada acción crítica |

---

## 📊 RESUMEN DE TECNOLOGÍAS

### Backend
| Tecnología | Uso |
|-----------|-----|
| **Node.js + Express** | Servidor API REST |
| **MySQL 8.0 (Aiven)** | Base de datos relacional en la nube |
| **Socket.IO** | Comunicación en tiempo real (WebSockets) |
| **JWT** | Autenticación stateless |
| **Bcrypt** | Encriptación de contraseñas |
| **Helmet.js** | Seguridad de headers HTTP |
| **Nodemailer** | Envío de correos electrónicos |
| **Speakeasy** | Generación de códigos TOTP (MFA) |
| **QRCode** | Generación de códigos QR |
| **Multer** | Subida de archivos (fotos de perfil) |
| **Swagger** | Documentación interactiva de API |

### Frontend
| Tecnología | Uso |
|-----------|-----|
| **Vanilla JS (SPA)** | Lógica del dashboard sin frameworks |
| **CSS3** | Glassmorphism, temas oscuro/claro, responsive |
| **Chart.js** | Gráficas de tráfico por horas |
| **jsPDF** | Exportación de reportes en PDF |
| **html5-qrcode** | Escáner QR con cámara |
| **Socket.IO Client** | Actualizaciones en tiempo real |

### Infraestructura
| Servicio | Plataforma |
|----------|-----------|
| **API Backend** | Render (Docker auto-deploy) |
| **Frontend Web** | Vercel (Edge Network) |
| **Base de Datos** | Aiven (MySQL Cloud con SSL) |
| **Repositorio** | GitHub (CI/CD Automático) |

---

## 📁 ESTRUCTURA DEL PROYECTO
```
Passly/
├── backend/                    ← Servidor API REST
│   ├── src/
│   │   ├── config/            # DB pool, Socket.IO, Swagger
│   │   ├── controllers/       # 8 controladores de lógica
│   │   ├── middlewares/       # Auth JWT, Seguridad, Upload
│   │   ├── routes/            # 10 archivos de rutas
│   │   ├── services/          # Email (Nodemailer)
│   │   ├── utils/             # Backup, Seed, Logger
│   │   └── app.js             # Express + Middlewares
│   ├── server.js              # HTTP + Socket.IO + Boot
│   └── package.json
├── frontend/                   ← Interfaz de usuario (SPA)
│   ├── css/index.css          # Estilos con temas
│   ├── js/                    # Módulos: api, dashboard, auth, utils
│   ├── index.html             # Login/Registro
│   ├── dashboard.html         # Panel principal
│   ├── scanner.html           # Escáner QR
│   ├── forgot.html            # Recuperar contraseña
│   └── reset.html             # Restablecer contraseña
├── database/                   ← Scripts SQL
│   └── passly.sql             # Schema completo (11 tablas)
├── docs/                       ← Documentación formal
│   ├── 00_GUIA_EXPOSICION.md  # ← ESTE ARCHIVO
│   ├── 01_REQUISITOS_Y_PROPUESTA.md
│   ├── 02_DIAGRAMAS_SISTEMA.md
│   ├── 03_BASE_DE_DATOS.md
│   ├── 04_MANUALES.md
│   └── 05_PRUEBAS_Y_DISEÑO.md
├── docker-compose.yml          # 3 servicios (API + MySQL + Nginx)
├── Dockerfile                  # Build para Render
├── render.yaml                 # Configuración de Render
└── README.md                   # Documentación principal
```

---

## 🗄️ BASE DE DATOS (11 Tablas)
| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `estados` | 4 | Activo, Inactivo, Mantenimiento, Bloqueado |
| `clientes` | 1+ | Unidades residenciales / empresas |
| `roles` | 3 | Admin, Usuario, Seguridad |
| `usuarios` | 6 | Maestro de personas con MFA y foto |
| `medios_transporte` | 4+ | Vehículo, Motocicleta, Bicicleta, Peatonal |
| `dispositivos` | 4+ | Vehículos asignados a usuarios |
| `equipos` | 0+ | Hardware técnico |
| `accesos` | 50+ | Log histórico de entradas/salidas |
| `logs_sistema` | 0+ | Auditoría administrativa |
| `recovery_codes` | 0+ | Códigos de recuperación de contraseña |
| `login_attempts` | 0+ | Control de intentos de acceso por IP |

---

## ❓ PREGUNTAS FRECUENTES EN EXPOSICIONES

**P: ¿Por qué no usaron React o Angular?**
> R: Passly demuestra que se puede construir una SPA profesional con Vanilla JS puro. Esto reduce dependencias, mejora el rendimiento y demuestra dominio de los fundamentos de JavaScript.

**P: ¿Cómo garantizan que las contraseñas son seguras?**
> R: Las contraseñas se encriptan con Bcrypt (salt 10). Es un hash irreversible: ni los administradores pueden ver las contraseñas reales en la base de datos.

**P: ¿Qué pasa si el servidor se cae?**
> R: El servidor en Render tiene restart automático. Además, si la BD falla, el servidor sigue respondiendo con mensajes de error controlados sin crashear.

**P: ¿Cómo funciona el QR de invitados?**
> R: Se genera un JWT firmado con los datos del invitado y un tiempo de expiración (4h a 1 semana). Al escanear el QR, el backend verifica la firma y la vigencia del token.

**P: ¿Por qué 3 servicios separados en la nube?**
> R: Separar Frontend (Vercel), API (Render) y BD (Aiven) permite escalar cada componente independientemente y es la práctica estándar de la industria (microservicios).

---

## 📚 ÍNDICE DE DOCUMENTACIÓN COMPLETA
| # | Documento | Contenido |
|---|-----------|-----------|
| 00 | **GUÍA DE EXPOSICIÓN** | Este archivo - Guión para la presentación |
| 01 | **REQUISITOS Y PROPUESTA** | Requisitos funcionales y no funcionales, arquitectura |
| 02 | **DIAGRAMAS DEL SISTEMA** | Casos de uso, clases, despliegue, actividades |
| 03 | **BASE DE DATOS** | Modelo E-R, normalización 3FN, esquema de tablas |
| 04 | **MANUALES** | Manual de instalación, técnico y de usuario |
| 05 | **PRUEBAS Y DISEÑO** | Reporte de pruebas funcionales, estrés y hardening |

---

*Passly v3.0.0 (Cloud Edition) © 2026 — Desplegado en Render + Vercel + Aiven*
