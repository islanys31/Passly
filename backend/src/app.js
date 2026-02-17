const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const deviceRoutes = require('./routes/device.routes');
const transportRoutes = require('./routes/transport.routes');
const accessRoutes = require('./routes/access.routes');
const statsRoutes = require('./routes/stats.routes');

// Importar middlewares de seguridad
const {
    helmetConfig,
    apiLimiter,
    sanitizeInput
} = require('./middlewares/security.middleware');

const compression = require('compression');
const { swaggerUi, swaggerDocs } = require('./config/swagger');

const app = express();

// Optimización - Compresión
app.use(compression());

// Seguridad - Headers de seguridad
app.use(helmetConfig);

// Documentación de API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// CORS configurado
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : '*',
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitización de inputs (prevenir XSS)
app.use(sanitizeInput);

// Rate limiting global para API
app.use('/api', apiLimiter);

// ============================================
// SERVIR FRONTEND
// ============================================

// Servir archivos estáticos del frontend con caché optimizada
app.use(express.static(path.join(__dirname, '../../frontend'), {
    maxAge: '7d', // Cache de 7 días para assets estáticos
    etag: true
}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// RUTAS API
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/dispositivos', deviceRoutes);
app.use('/api/medios-transporte', transportRoutes);
app.use('/api/accesos', accessRoutes);
app.use('/api/stats', statsRoutes);

// ============================================
// RUTAS FRONTEND
// ============================================

// Ruta raíz - Servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Ruta de prueba de API
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Passly API',
        status: 'running',
        version: '1.0.0',
        security: 'enabled'
    });
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================

// 404 - Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
