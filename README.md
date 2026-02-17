# 🔐 Passly - Sistema de Control de Accesos Inteligente

![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![Node](https://img.shields.io/badge/node-18.x-blue.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0-orange.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**Passly** es un sistema de control de accesos moderno y seguro diseñado para unidades residenciales, edificios corporativos y espacios que requieren gestión de entradas y salidas con tecnología QR, validación en tiempo real y reportes profesionales.

---

## 🌟 Características Principales

### 🔐 Autenticación y Seguridad
- ✅ Sistema de login con JWT y roles (Administrador, Usuario, Seguridad)
- ✅ Registro con validaciones estrictas (emails @gmail/@hotmail, contraseñas complejas)
- ✅ Recuperación de contraseña por email con códigos de 6 dígitos
- ✅ Rate limiting para prevenir ataques de fuerza bruta
- ✅ Helmet.js para headers de seguridad (CSP, HSTS, XSS)
- ✅ Sanitización de inputs y validaciones backend/frontend

### 👥 Gestión de Usuarios
- ✅ CRUD completo con validaciones
- ✅ Subida de fotos de perfil (JPG/PNG, máx 2MB)
- ✅ Estados: Activo, Inactivo, Bloqueado
- ✅ Roles diferenciados con permisos

### 📱 Gestión de Dispositivos
- ✅ Registro de puntos de acceso (Peatonal, Vehicular, Mixto)
- ✅ Identificadores únicos y ubicaciones
- ✅ Estados y mantenimiento

### 🚪 Control de Accesos
- ✅ Registro manual de entradas/salidas
- ✅ Historial completo con filtros y búsqueda
- ✅ Exportación a CSV y PDF profesional
- ✅ Observaciones y notas por acceso
- ✅ Actualización en tiempo real (WebSockets)

### 🔑 Sistema QR (Premium)
- ✅ Generación de QR personal para usuarios registrados
- ✅ Generación de QR temporal para invitados (4h - 1 semana)
- ✅ Descarga de QR como imagen PNG
- ✅ Validación automática con JWT firmado
- ✅ Escáner QR con cámara (requiere HTTPS)
- ✅ Registro automático de accesos al escanear

### 📊 Dashboard en Tiempo Real
- ✅ Estadísticas generales (usuarios, dispositivos, accesos)
- ✅ Gráfica de tráfico por horas (Chart.js)
- ✅ Últimos accesos en vivo
- ✅ Tarjeta de QR personal
- ✅ WebSockets para actualizaciones instantáneas

### 🎨 Interfaz Moderna
- ✅ Tema claro/oscuro persistente
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Animaciones y transiciones suaves
- ✅ Toasts de notificación
- ✅ Modales dinámicos

---

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18.x o superior
- MySQL 8.0 o superior
- npm o yarn

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/Passly.git
cd Passly
```

### 2. Configurar Base de Datos
```bash
# Crear la base de datos
mysql -u root -p < database/passly.sql
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env` en la carpeta `backend/`:

```env
# Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=passly
DB_PORT=3306

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui

# Servidor
PORT=3000
NODE_ENV=development

# Email (Opcional - para recuperación de contraseña)
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
```

### 4. Instalar Dependencias
```bash
# Backend
cd backend
npm install

# Frontend (si es necesario)
cd ../frontend
npm install
```

### 5. Iniciar el Servidor
```bash
cd backend
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

---

## 📁 Estructura del Proyecto

```
Passly/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuraciones (DB, Socket.IO, Swagger)
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── middlewares/     # Auth, Security, Upload
│   │   ├── routes/          # Rutas de la API
│   │   ├── services/        # Servicios (Email)
│   │   └── app.js           # Configuración de Express
│   ├── uploads/             # Fotos de perfil
│   ├── .env                 # Variables de entorno
│   └── package.json
├── frontend/
│   ├── css/                 # Estilos
│   ├── js/                  # Lógica del cliente
│   ├── dashboard.html       # Panel principal
│   ├── index.html           # Login/Registro
│   └── scanner.html         # Escáner QR
├── database/
│   └── passly.sql           # Schema de la BD
└── README.md
```

---

## 🔑 Credenciales por Defecto

**Administrador**:
- Email: `admin@gmail.com`
- Contraseña: `Admin123!`
- Rol: Administrador

> ⚠️ **IMPORTANTE**: Cambia estas credenciales en producción.

---

## 📖 Uso del Sistema

### 1. Registro de Usuarios
1. Ve a la página de login
2. Haz clic en "¿No tienes cuenta? Regístrate aquí"
3. Completa el formulario con:
   - Nombre y apellido (con mayúscula inicial)
   - Email (@gmail.com o @hotmail.com)
   - Contraseña (8-12 caracteres, mayúscula, minúscula, número, especial)
   - Rol
4. Acepta los términos y haz clic en "Registrar"

### 2. Gestión de Accesos
1. Inicia sesión y ve al módulo "Accesos"
2. Haz clic en "+ Registro Manual"
3. Selecciona:
   - Usuario registrado
   - Dispositivo (punto de acceso)
   - Tipo (Entrada/Salida)
   - Observaciones (opcional)
4. Guarda el registro

### 3. Generar QR Personal
1. En el dashboard, ve a la tarjeta "Mi Llave QR"
2. Haz clic en "Generar"
3. Descarga la imagen con el botón "Descargar"
4. Usa este QR para accesos rápidos

### 4. Crear Invitación QR
1. Ve a "Accesos" → "+ Registro Manual"
2. Selecciona la pestaña "Nuevo Invitado (QR)"
3. Ingresa el nombre del invitado
4. Selecciona la duración (4h - 1 semana)
5. Genera y comparte el QR

### 5. Escanear QR
1. Haz clic en "📷 Escáner QR" (solo Admin/Seguridad)
2. Permite el acceso a la cámara
3. Apunta al código QR
4. El sistema registrará el acceso automáticamente

### 6. Exportar Reportes
1. Ve a "Accesos"
2. Usa los filtros si es necesario
3. Haz clic en:
   - **📊 CSV**: Para Excel
   - **📄 PDF**: Para reporte formal con logo

### 7. Recuperar Contraseña
1. Haz 3 intentos fallidos de login
2. Aparecerá "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Recibirás un código de 6 dígitos
5. Ingresa el código y tu nueva contraseña

---

## 🛡️ Seguridad Implementada

### Medidas de Protección
- ✅ **Helmet.js**: Headers de seguridad (CSP, HSTS, X-Frame-Options)
- ✅ **Rate Limiting**: 
  - Login: 100 intentos/15 min
  - Registro: 50 intentos/hora
  - Recuperación: 3 intentos/hora
- ✅ **Validaciones Estrictas**:
  - Emails solo @gmail/@hotmail
  - Contraseñas 8-12 caracteres con complejidad
  - Sanitización de inputs (prevención XSS)
- ✅ **JWT**: Tokens firmados con expiración
- ✅ **Bcrypt**: Hash de contraseñas con salt
- ✅ **CORS**: Configurado para producción

### Recomendaciones para Producción
1. Cambia `JWT_SECRET` a una clave de 256 bits
2. Configura HTTPS con certificado SSL
3. Cambia las credenciales por defecto
4. Configura backups automáticos de la BD
5. Habilita logs de auditoría

---

## 📊 API Endpoints

### Autenticación
```
POST /api/auth/register          # Registrar usuario
POST /api/auth/login             # Iniciar sesión
POST /api/auth/forgot-password   # Solicitar código de recuperación
POST /api/auth/reset-password    # Restablecer contraseña
```

### Usuarios
```
GET    /api/usuarios             # Listar usuarios
POST   /api/usuarios             # Crear usuario
PUT    /api/usuarios/:id         # Actualizar usuario
DELETE /api/usuarios/:id         # Eliminar (soft delete)
POST   /api/usuarios/:id/photo   # Subir foto de perfil
```

### Dispositivos
```
GET    /api/dispositivos         # Listar dispositivos
POST   /api/dispositivos         # Crear dispositivo
PUT    /api/dispositivos/:id     # Actualizar dispositivo
DELETE /api/dispositivos/:id     # Eliminar dispositivo
```

### Accesos
```
GET    /api/accesos              # Listar accesos
POST   /api/accesos              # Registrar acceso manual
GET    /api/accesos/qr           # Generar QR personal
POST   /api/accesos/invitation   # Crear invitación QR
POST   /api/accesos/scan         # Validar QR escaneado
```

### Estadísticas
```
GET    /api/stats                # Estadísticas generales
```

> 📘 Documentación completa en: `http://localhost:3000/api-docs` (Swagger)

---

## 🧪 Testing

### Simulación de Recuperación de Contraseña
```bash
cd backend
node test-recovery.js
```

Esto generará un código de prueba (`123456`) para `admin@gmail.com`.

---

## 🐳 Docker (Opcional)

```bash
# Construir y levantar contenedores
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

---

## 🔧 Troubleshooting

### Error: "Cannot connect to database"
- Verifica que MySQL esté corriendo
- Revisa las credenciales en `.env`
- Asegúrate de que la BD `passly` exista

### Error: "QR Scanner no funciona"
- El escáner requiere HTTPS o localhost
- Verifica permisos de cámara en el navegador
- Alternativa: Usa la opción de subir imagen de QR

### Error: "Email no se envía"
- Configura `EMAIL_USER` y `EMAIL_PASS` en `.env`
- Usa una "Contraseña de Aplicación" de Gmail
- Verifica que la verificación en 2 pasos esté activa

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Changelog

### v2.0.0 (2026-02-17)
- ✨ Sistema QR completo (generación, validación, escáner)
- ✨ Recuperación de contraseña por email
- ✨ Subida de fotos de perfil
- ✨ Exportación de reportes en PDF
- ✨ Dashboard en tiempo real con WebSockets
- 🔒 Hardening de seguridad completo
- 🎨 UI/UX mejorada con tema claro/oscuro

### v1.0.0 (2025-11-25)
- 🎉 Lanzamiento inicial
- ✅ CRUD de usuarios y dispositivos
- ✅ Control de accesos básico
- ✅ Autenticación con JWT

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👨‍💻 Autor

**Equipo Passly**  
📧 Email: soporte@passly.com  
🌐 Web: https://passly.com

---

## 🙏 Agradecimientos

- [Express.js](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [Chart.js](https://www.chartjs.org/)
- [jsPDF](https://github.com/parallax/jsPDF)
- [QRCode.js](https://github.com/davidshimjs/qrcodejs)
- [Helmet.js](https://helmetjs.github.io/)

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**
