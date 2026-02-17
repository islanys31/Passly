# 🎯 SOLUCIÓN: Frontend + Backend en un Solo Servidor

## ❌ Problema Original

Al acceder a `http://localhost:3000`, solo se veía JSON:
```json
{"message": "Welcome to Passly API"}
```

Esto ocurría porque el backend solo era una API REST, no servía archivos HTML.

---

## ✅ Solución Implementada

Ahora **Express sirve el frontend automáticamente** desde el mismo puerto 3000.

### Cambios realizados en `backend/src/app.js`:

```javascript
const path = require('path');

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

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
| `http://localhost:3000` | **Frontend** - Página de login/registro |
| `http://localhost:3000/dashboard.html` | Dashboard (requiere login) |
| `http://localhost:3000/api` | **API** - Información del backend (JSON) |
| `http://localhost:3000/api/auth/login` | Endpoint de login (POST) |

---

## 📂 Estructura de Rutas

```
http://localhost:3000/
│
├── /                          → index.html (Login/Registro)
├── /dashboard.html            → Dashboard
├── /css/index.css             → Estilos
│
└── /api/                      → API REST (JSON)
    ├── /api/auth/register     → POST - Registrar usuario
    ├── /api/auth/login        → POST - Login
    ├── /api/usuarios          → GET - Listar usuarios
    ├── /api/dispositivos      → GET - Listar dispositivos
    └── /api/accesos           → GET - Historial de accesos
```

---

## 🎨 Ventajas de Esta Configuración

✅ **Un solo puerto** - Todo en `localhost:3000`  
✅ **Sin CORS** - Frontend y backend en el mismo origen  
✅ **Fácil despliegue** - Un solo servidor para todo  
✅ **Desarrollo rápido** - No necesitas Live Server  

---

## 🔧 Alternativa: Servidores Separados

Si prefieres tener frontend y backend en puertos diferentes:

### Backend (puerto 3000):
```bash
cd backend
npm run dev
```

### Frontend (puerto 5500):
Usa **Live Server** en VS Code:
1. Click derecho en `frontend/index.html`
2. Selecciona "Open with Live Server"

En este caso, el frontend estará en `http://localhost:5500` y el backend en `http://localhost:3000`.

---

## ✨ Resultado Final

Ahora al acceder a `http://localhost:3000` verás:

- ✅ La página de **login/registro** (HTML completo)
- ✅ Estilos CSS aplicados
- ✅ JavaScript funcionando
- ✅ Conexión con el backend API

**¡Todo funcionando desde un solo servidor!** 🎉
