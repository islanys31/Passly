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

### 1. Navegar por el Dashboard
Después de hacer login, verás el panel principal con:
- **Estadísticas**: Usuarios activos, accesos del día, dispositivos, alertas
- **Gráfica**: Tráfico de accesos por horas (Chart.js)
- **Últimos Accesos**: Tabla con actualizaciones en tiempo real (WebSockets)
- **QR Personal**: Tu código QR para acceso rápido

### 2. Crear un Usuario
1. Menú lateral → **Usuarios** → "**+ Nuevo Usuario**"
2. Completa nombre, apellido, email, contraseña, rol
3. Opcionalmente sube una foto de perfil
4. Guarda

### 3. Registrar un Dispositivo
1. Menú lateral → **Dispositivos** → "**+ Nuevo Dispositivo**"
2. Selecciona usuario, tipo de medio de transporte, nombre e identificador
3. Guarda

### 4. Registrar un Acceso Manual
1. Menú lateral → **Accesos** → "**+ Registro Manual**"
2. Selecciona usuario, dispositivo (opcional), tipo (Entrada/Salida)
3. Agrega observaciones si es necesario
4. Guarda. El dashboard se actualiza automáticamente para todos los conectados.

### 5. Generar tu QR Personal
1. En el dashboard, busca la tarjeta "**Mi Llave QR**"
2. Haz clic en "**Generar**"
3. Descarga la imagen PNG con "**Descargar**"

### 6. Crear una Invitación QR
1. Accesos → "**+ Registro Manual**" → Pestaña "**Nuevo Invitado (QR)**"
2. Ingresa el nombre del invitado
3. Selecciona duración (4 horas - 1 semana)
4. Genera y comparte el QR con el invitado

### 7. Escanear un QR
1. Haz clic en "**📷 Escáner QR**" en el menú
2. Permite acceso a la cámara
3. Apunta al código QR
4. El acceso se registra automáticamente

---

## 📊 Exportar Reportes

### CSV (Excel)
1. Ve a "**Accesos**"
2. Haz clic en "**📊 CSV**"
3. Abre con Excel o Google Sheets

### PDF (Formal)
1. Ve a "**Accesos**"
2. Haz clic en "**📄 PDF**"
3. Descarga el reporte profesional con logo y formato corporativo

---

## 🔐 Recuperar Contraseña

1. Haz 3 intentos fallidos de login
2. Clic en "**¿Olvidaste tu contraseña?**"
3. Ingresa tu email registrado
4. Recibe un código de 6 dígitos en tu correo (válido 15 min)
5. Ingresa el código y crea tu nueva contraseña

> **Nota**: Se requiere configurar `EMAIL_USER` y `EMAIL_PASS` en `backend/.env` para envío real de emails. Para pruebas sin email configurado, puedes usar:
> ```bash
> node backend/test-recovery.js
> ```
> Código de prueba: `123456`

---

## 🐳 Docker (Producción)

```bash
# Levantar todo con un comando
docker-compose up -d --build

# Verificar que todo esté corriendo
docker ps

# Ver logs
docker-compose logs -f
```

Accede a: `http://localhost` (puerto 80 vía Nginx)

---

## 🛠️ Configuración Opcional

### Email para Recuperación
Edita `backend/.env`:
```env
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
```
> Necesitas una "Contraseña de Aplicación" de Google: https://support.google.com/accounts/answer/185833

### HTTPS para Escáner QR
El escáner de cámara requiere HTTPS en producción. En desarrollo funciona en `localhost`.

---

## 🐛 Problemas Comunes

| Problema | Solución |
|----------|----------|
| "Cannot connect to database" | Verifica MySQL y credenciales en `.env` |
| "Port 3000 already in use" | Cambia `PORT` en `.env` o mata el proceso |
| "QR Scanner no funciona" | Usa HTTPS o `localhost` |
| "Email no se envía" | Configura `EMAIL_USER` y `EMAIL_PASS` |
| "CORS error" | Verifica `FRONTEND_URL` en `.env` |
| "Token expirado" | Re-iniciar sesión (logout y login) |

---

## 📚 Documentación Completa

- [README.md](README.md) - Documentación completa
- [ANALISIS_FUNCIONALIDADES.md](ANALISIS_FUNCIONALIDADES.md) - Estado del proyecto
- [REPORTE_TECNICO_HARDENING.md](REPORTE_TECNICO_HARDENING.md) - Reporte de seguridad
- [docs/04_MANUALES.md](docs/04_MANUALES.md) - Manuales de operación
- API Docs: `http://localhost:3000/api-docs` (Swagger)

---

## 🆘 Soporte

- 📧 Email: soporte@passly.com
- 🐛 Issues: https://github.com/tu-usuario/Passly/issues

---

**¡Listo! Ya puedes usar Passly.** 🎉
