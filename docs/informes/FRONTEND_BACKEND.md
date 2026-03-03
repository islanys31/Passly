# 🎯 Frontend + Backend en un Solo Servidor - PASSLY

## ✅ Arquitectura Actual

**Express sirve el frontend automáticamente** desde el mismo puerto 3000, eliminando problemas de CORS y simplificando el deployment.

### Configuración en `backend/src/app.js`:

```javascript
const path = require('path');

// Servir archivos estáticos del frontend con caché optimizada
app.use(express.static(path.join(__dirname, '../../frontend'), {
    maxAge: '7d', // Cache de 7 días para assets estáticos
    etag: true
}));

// Ruta raíz - Servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});
```

---

## 🚀 Cómo Usar

### 1. Inicia el backend:
```bash
cd backend
npm run dev
```

### 2. Accede desde el navegador:

| URL | Descripción |
|-----|-------------|
| `http://localhost:3000` | **Frontend** - Login/Registro |
| `https://localhost` | **Producción** - Conexión Segura (SSL) |
| `http://localhost:3000/dashboard.html` | Dashboard (requiere login/MFA) |
| `http://localhost:3000/scanner.html` | Escáner QR (Soporta cámara vía HTTPS) |
| `http://localhost:3000/api-docs` | **Swagger** - Documentación interactiva |

---

## 📂 Estructura de Rutas

```
http://localhost:3000/
│
├── /                              → index.html (Login/Registro)
├── /dashboard.html                → Dashboard con estadísticas
├── /scanner.html                  → Escáner QR con cámara
├── /forgot.html                   → Solicitar recuperación
├── /reset.html                    → Restablecer contraseña
├── /css/index.css                 → Estilos con temas
├── /js/                           → Lógica del cliente
│
└── /api/                          → API REST (JSON)
    ├── /api/auth/register         → POST - Registrar usuario
    ├── /api/auth/login            → POST - Login inicial
    ├── /api/auth/mfa/login       → POST - Verificación TOTP
    ├── /api/auth/forgot-password  → POST - Solicitar código
    ├── /api/auth/reset-password   → POST - Restablecer contraseña
    ├── /api/usuarios              → CRUD - Usuarios
    ├── /api/usuarios/:id/photo    → POST - Subir foto de perfil
    ├── /api/dispositivos          → CRUD - Dispositivos
    ├── /api/medios-transporte     → GET - Medios de transporte
    ├── /api/accesos               → GET/POST - Accesos
    ├── /api/accesos/qr            → GET - Generar QR personal
    ├── /api/accesos/invitation    → POST - Crear invitación QR
    ├── /api/accesos/scan          → POST - Validar escaneo QR
    ├── /api/stats                 → GET - Estadísticas del dashboard
    └── /api-docs                  → Swagger UI (documentación)
```

---

## 🎨 Ventajas de Esta Configuración

✅ **Un solo puerto** - Todo en `localhost:3000`  
✅ **Sin CORS** - Frontend y backend en el mismo origen  
✅ **Fácil despliegue** - Un solo servidor para todo  
✅ **Caché optimizada** - Assets estáticos con 7 días de caché y ETags  
✅ **Compresión** - Gzip activado con compression middleware  
✅ **WebSockets** - Socket.IO integrado en el mismo servidor  

---

## 🐳 Alternativa: Docker (Producción)

En producción, Nginx actúa como reverse proxy:

```bash
docker-compose up -d --build
```

| Servicio | Puerto | Función |
|----------|--------|---------|
| Nginx | 80 / 443 | Reverse proxy + SSL + Assets |
| API | 3000 (interno) | Backend + Socket.IO |
| MySQL | 3306 (interno) | Base de datos |
| Certbot | N/A | Renovación SSL automática |

---

## ✨ Resultado

Al acceder a `http://localhost:3000` verás:

- ✅ La página de **login/registro** con diseño premium
- ✅ Modo oscuro/claro funcional
- ✅ Validaciones en tiempo real
- ✅ Conexión con el backend API
- ✅ WebSockets para actualizaciones live

**¡Todo funcionando desde un solo servidor!** 🎉
