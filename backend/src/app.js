/**
 * @file app.js
 * @description Configuración central de la aplicación Express.
 * Aquí se definen los middlewares de seguridad, rutas, compresión y manejo de errores.
 * Funciona como el 'cerebro' que orquesta cómo se procesan las peticiones.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const cookieParser = require('cookie-parser'); // Permite leer cookies httpOnly del navegador

// Importación de rutas de la API
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const deviceRoutes = require('./routes/device.routes');
const equipoRoutes = require('./routes/equipo.routes'); // Equipos tecnológicos (tabla propia)
const transportRoutes = require('./routes/transport.routes');
const accessRoutes = require('./routes/access.routes');
const statsRoutes = require('./routes/stats.routes');
const logRoutes = require('./routes/log.routes');

// Importar middlewares de seguridad reforzada (Hardening)
const {
    helmetConfig, // Protege contra vulnerabilidades web comunes mediante cabeceras HTTP
    apiLimiter,    // Controla el número de peticiones para evitar ataques de denegación de servicio o fuerza bruta
    sanitizeInput  // Limpia los datos de entrada para prevenir ataques XSS (Inyección de Scripts)
} = require('./middlewares/security.middleware');

// Documentación de API con Swagger
const { swaggerUi, swaggerDocs } = require('./config/swagger');

const app = express();
app.set('trust proxy', 1); // Confiar en el primer proxy (Nginx) para obtener la IP real

/**
 * OPTIMIZACIÓN: Compresión Gzip.
 * Reduce el tamaño de las respuestas HTTP, acelerando la carga para el usuario.
 */
app.use(compression());

/**
 * SEGURIDAD: Cookie Parser.
 * Necesario para leer el JWT almacenado en cookies httpOnly (más seguro que localStorage).
 */
app.use(cookieParser());

/**
 * SEGURIDAD: Helmet.
 * Configura múltiples cabeceras HTTP de seguridad para blindar la aplicación.
 */
app.use(helmetConfig);

/**
 * DOCUMENTACIÓN: Swagger UI.
 * Expone una interfaz interactiva en /api-docs para probar los endpoints.
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * CORS (Cross-Origin Resource Sharing).
 * Define quién puede consumir esta API. En producción se restringe al dominio del frontend.
 */
app.use(cors({
    origin: (origin, callback) => {
        // En desarrollo permitimos todo
        if (process.env.NODE_ENV !== 'production' || !origin) {
            return callback(null, true);
        }

        // En producción comparamos con FRONTEND_URL o permitimos localhost si es el mismo host
        const allowed = [process.env.FRONTEND_URL, 'http://localhost', 'http://127.0.0.1'];
        if (allowed.includes(origin) || origin.startsWith('http://localhost')) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
}));

/**
 * PARSERS: Lectura de datos.
 * Permite que el servidor entienda datos en formato JSON y formularios URL-encoded.
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * SEGURIDAD: Sanitización de inputs.
 * Middleware personalizado que recorre req.body, req.query y req.params eliminando caracteres peligrosos.
 */
app.use(sanitizeInput);

/**
 * SEGURIDAD: Rate Limiting.
 * Limita el tráfico global a la API para evitar abusos.
 */
app.use('/api', apiLimiter);

// ============================================
// SERVIR ARCHIVOS ESTÁTICOS (FRONTEND)
// ============================================

/**
 * Sirve los archivos de la carpeta 'frontend'.
 * Incluye una política de caché de 7 días para mejorar el rendimiento.
 */
app.use(express.static(path.join(__dirname, '../../frontend'), {
    maxAge: '7d',
    etag: true
}));

/**
 * Sirve las fotos de perfil subidas por los usuarios.
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// REGISTRO DE RUTAS DE LA API
// ============================================

app.use('/api/auth', authRoutes);         // Registro, Login, MFA, Password Recovery
app.use('/api/usuarios', userRoutes);     // CRUD de Usuarios y fotos
app.use('/api/dispositivos', deviceRoutes); // CRUD de Vehículos
app.use('/api/equipos', equipoRoutes);    // CRUD de Equipos Tecnológicos (Tabla separada)
app.use('/api/transportes', transportRoutes); // Listado de medios (Coche, Moto, etc)
app.use('/api/accesos', accessRoutes);     // Registro de entradas/salidas y QR
app.use('/api/stats', statsRoutes);       // Datos para las gráficas del Dashboard
app.use('/api/logs', logRoutes);           // Historial de auditoría para administradores

// ============================================
// MANEJO DE RUTAS DEL FRONTEND
// ============================================

/**
 * Ruta raíz: Envía el archivo index.html (Página de Login/Registro).
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ============================================
// SISTEMA DE CONTROL DE ERRORES (GLOBAL)
// ============================================

/**
 * Middleware para capturar rutas que no existen (404).
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'La ruta solicitada no existe en el servidor Passly'
    });
});

/**
 * Error Handler Centralizado.
 * Captura cualquier error ocurrido en los controladores y envía una respuesta controlada.
 * En desarrollo muestra el 'stack trace', en producción solo el mensaje de error.
 */
app.use((err, req, res, next) => {
    console.error('💣 Error detectado:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
