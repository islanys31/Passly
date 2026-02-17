# 🚀 Guía Rápida de Inicio - Passly

Esta guía te ayudará a poner en marcha Passly en menos de 10 minutos.

---

## ⚡ Inicio Rápido

### 1. Requisitos
- Node.js 18+ instalado
- MySQL 8.0+ corriendo
- Git instalado

### 2. Instalación (5 minutos)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/Passly.git
cd Passly

# 2. Crear la base de datos
mysql -u root -p < database/passly.sql

# 3. Configurar variables de entorno
cd backend
cp .env.example .env
# Edita .env con tus credenciales de MySQL

# 4. Instalar dependencias
npm install

# 5. Iniciar el servidor
npm run dev
```

### 3. Acceder al Sistema

Abre tu navegador en: `http://localhost:3000`

**Credenciales de prueba**:
- Email: `admin@gmail.com`
- Contraseña: `Admin123!`
- Rol: Administrador

---

## 🎯 Primeros Pasos

### 1. Crear un Usuario
1. Dashboard → Usuarios → "+ Nuevo Usuario"
2. Completa el formulario
3. Guarda

### 2. Registrar un Dispositivo
1. Dashboard → Dispositivos → "+ Nuevo Dispositivo"
2. Define nombre, tipo y ubicación
3. Guarda

### 3. Registrar un Acceso
1. Dashboard → Accesos → "+ Registro Manual"
2. Selecciona usuario y dispositivo
3. Elige Entrada o Salida
4. Guarda

### 4. Generar tu QR Personal
1. En el dashboard, ve a "Mi Llave QR"
2. Haz clic en "Generar"
3. Descarga la imagen

### 5. Crear una Invitación QR
1. Accesos → "+ Registro Manual" → Pestaña "Nuevo Invitado (QR)"
2. Ingresa nombre del invitado
3. Selecciona duración (4h - 1 semana)
4. Genera y comparte

---

## 📊 Exportar Reportes

### CSV (Excel)
1. Ve a "Accesos"
2. Haz clic en "📊 CSV"
3. Abre con Excel

### PDF (Formal)
1. Ve a "Accesos"
2. Haz clic en "📄 PDF"
3. Descarga el reporte profesional

---

## 🔐 Recuperar Contraseña

1. Haz 3 intentos fallidos de login
2. Clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Usa el código que recibes
5. Crea nueva contraseña

> **Nota**: Si no configuraste el email, usa el script de prueba:
> ```bash
> node backend/test-recovery.js
> ```
> Código de prueba: `123456`

---

## 🛠️ Configuración Opcional

### Email para Recuperación
Edita `backend/.env`:
```env
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
```

### HTTPS para Escáner QR
El escáner de cámara requiere HTTPS en producción. En desarrollo funciona en `localhost`.

---

## 🐛 Problemas Comunes

| Problema | Solución |
|----------|----------|
| "Cannot connect to database" | Verifica MySQL y credenciales en `.env` |
| "Port 3000 already in use" | Cambia `PORT` en `.env` o mata el proceso |
| "QR Scanner no funciona" | Usa HTTPS o localhost |
| "Email no se envía" | Configura `EMAIL_USER` y `EMAIL_PASS` |

---

## 📚 Documentación Completa

- [README.md](README.md) - Documentación completa
- [ANALISIS_FUNCIONALIDADES.md](ANALISIS_FUNCIONALIDADES.md) - Estado del proyecto
- API Docs: `http://localhost:3000/api-docs`

---

## 🆘 Soporte

- 📧 Email: soporte@passly.com
- 🐛 Issues: https://github.com/tu-usuario/Passly/issues

---

**¡Listo! Ya puedes usar Passly.** 🎉
