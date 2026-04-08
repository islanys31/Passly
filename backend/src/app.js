/**
 * @file app.js
 * @description Configuración central del servidor Express para Passly.
 * 
 * [ESTRUCTURA DE ESTUDIO]
 * Este archivo actúa como el "cerebro" o orquestador de la aplicación.
 * Define cómo se procesan las peticiones que llegan desde el frontend antes de ser
 * manejadas por los controladores específicos de cada módulo.
 * 
 * Conceptos clave explicados aquí:
 * 1. Middlewares: Capas de procesamiento.
 * 2. Seguridad: Blindaje contra ataques web comunes.
 * 3. Rotación: Cómo se exponen las rutas de la API.
 */

const express = require('express');
const cors = require('cors');           // Permite peticiones desde otros dominios (el navegador)
const path = require('path');
const compression = require('compression'); // Optimización de tamaño de datos
const cookieParser = require('cookie-parser'); // Herramienta para gestionar sesiones seguras (Cookies httpOnly)

// ============================================
// IMPORTACIÓN DE RUTAS (MÓDULOS DEL SISTEMA)
// ============================================
// Cada archivo de rutas contiene los "caminos" específicos (endpoints) para una funcionalidad.
const authRoutes = require('./routes/auth.routes');         // Autenticación (Login/Registro)
const userRoutes = require('./routes/user.routes');         // Gestión de perfiles
const deviceRoutes = require('./routes/device.routes');     // Gestión de vehículos/activos
const equipoRoutes = require('./routes/equipo.routes');    // Gestión de hardware técnico
const transportRoutes = require('./routes/transport.routes'); // Tipos de vehículos
const accessRoutes = require('./routes/access.routes');     // Registro de movimientos
const statsRoutes = require('./routes/stats.routes');       // Datos estadísticos para gráficas
const logRoutes = require('./routes/log.routes');           // Rastro de auditoría para admin
const configRoutes = require('./routes/config.routes');     // Configuraciones del sistema
const clientRoutes = require('./routes/client.routes');     // Módulo Multi-tenancy

// ============================================
// SEGURIDAD REFORZADA (HARDENING)
// ============================================
// Estas herramientas blindan el servidor contra vulnerabilidades comunes (OWASP Top 10).
const {
    helmetConfig, // Inyecta cabeceras HTTP de seguridad (ej. evita clickjacking)
    apiLimiter,    // Previene ataques de fuerza bruta al limitar peticiones por IP
    sanitizeInput  // Neutraliza datos peligrosos (ej. inyección de etiquetas <script>)
} = require('./middlewares/security.middleware');

// Configuración de Swagger: Genera documentación interactiva automática de la API
const { swaggerUi, swaggerDocs } = require('./config/swagger');

/**
 * INICIALIZACIÓN DE EXPRESS
 * Express es un framework de Node.js que facilita la creación de servidores web.
 */
const app = express();

/**
 * CONFIGURACIÓN DE CONFIANZA EN EL PROXY
 * Si el servidor corre detrás de un balanceador de carga o un proxy (como Nginx o Cloudflare),
 * 'trust proxy' permite que el servidor vea la IP real del usuario en lugar de la del proxy.
 */
app.set('trust proxy', 1);

/**
 * OPTIMIZACIÓN: Compresión (Gzip)
 * Reduce drásticamente el peso de los datos enviados por red (hasta un 70%), 
 * mejorando la velocidad de carga de la página.
 */
app.use(compression());

/**
 * SESIONES SEGURAS: Cookie Parser
 * Las cookies 'httpOnly' son el estándar de seguridad más alto para tokens JWT.
 * Este middleware las extrae y las hace legibles para el servidor (req.cookies).
 */
app.use(cookieParser());

/**
 * BLINDAJE HTTP: Helmet
 * Configura múltiples políticas de seguridad en la respuesta HTTP para evitar que
 * el navegador ejecute contenido no autorizado o sea engañado por atacantes.
 */
app.use(helmetConfig);

/**
 * DOCUMENTACIÓN: Swagger UI
 * Expone la documentación técnica en /api-docs.
 * Muy útil para desarrolladores que necesiten saber qué datos acepta cada ruta.
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * PROTOCOLO CORS (Cross-Origin Resource Sharing)
 * Por seguridad, los navegadores bloquean llamadas de un sitio A a un sitio B.
 * Aquí configuramos explícitamente que el servidor permita llamadas SOLO desde el 
 * dominio oficial de Passly, permitiendo además el envío de cookies seguras (credentials).
 */
app.use(cors({
    origin: (origin, callback) => {
        // En entorno de desarrollo permitimos cualquier origen para facilitar el testeo
        if (process.env.NODE_ENV !== 'production' || !origin) {
            return callback(null, true);
        }

        const allowed = [process.env.FRONTEND_URL, 'http://localhost', 'http://127.0.0.1'];
        if (allowed.includes(origin) || origin.startsWith('http://localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por seguridad - Política de CORS'));
        }
    },
    credentials: true // Crucial para que el navegador acepte y envíe las cookies de sesión
}));

/**
 * ANALIZADORES DE DATOS (Parsers)
 * Transforman el flujo de datos binarios que llega por red en objetos JSON 
 * fáciles de usar en programación.
 */
app.use(express.json({ limit: '10mb' })); // Soporta envíos JSON grandes (ej. fotos en Base64)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * LIMPIEZA DE DATOS: Sanitización
 * Analiza req.body y req.query buscando patrones sospechosos para evitar ataques XSS
 * (Cross-Site Scripting), donde un atacante intenta inyectar código JS en la base de datos.
 */
app.use(sanitizeInput);

/**
 * CONTROL DE TRÁFICO: Rate Limiting
 * Si un usuario (o robot) hace demasiadas peticiones en poco tiempo, el servidor 
 * lo bloquea temporalmente. Esto protege contra ataques de Denegación de Servicio (DoS).
 */
app.use('/api', apiLimiter);

// ============================================
// SERVICIO DE ARCHIVOS ESTÁTICOS Y WEB
// ============================================

/**
 * SIRVIENDO EL FRONTEND
 * Le dice a Express que si alguien pide un archivo que existe en la carpeta 'frontend', 
 * se lo entregue directamente (imágenes, CSS, JS del cliente).
 */
app.use(express.static(path.join(__dirname, '../../frontend'), {
    maxAge: 0, // Deshabilitado para desarrollo: fuerza descarga continua
    etag: true
}));

/**
 * CARPETA DE SUBIDAS (UPLOADS)
 * Permite que las fotos de perfil/vehículos sean públicamente accesibles vía URL.
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// REGISTRO DE RUTAS DE LA API (ENDPOINT MAPPING)
// ============================================
// Se asocia cada conjunto de lógica con un prefijo de URL.
app.use('/api/auth', authRoutes);         // Lógica de Identidad (Seguridad Crítica)
app.use('/api/usuarios', userRoutes);     // Perfiles y Gestión Humana
app.use('/api/dispositivos', deviceRoutes); // Inventario de Activos (Ej. Vehículos)
app.use('/api/equipos', equipoRoutes);    // Control de Hardware Técnico
app.use('/api/transportes', transportRoutes); // Diccionario de Medios
app.use('/api/accesos', accessRoutes);     // Inteligencia de Acceso y códigos QR
app.use('/api/stats', statsRoutes);       // Analítica y KPI's
app.use('/api/logs', logRoutes);           // Transparencia y Trazabilidad (Auditoría)
app.use('/api/config', configRoutes);      // Configuración General
app.use('/api/clientes', clientRoutes);    // Módulo Multi-tenancy

// ============================================
// AUTO-REPARACIÓN TEMPORAL (SEED)
// ============================================

// RUTA RAIZ: Mensaje de estado para verificar que la API está viva
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 Passly API is Online & Secure',
        version: '3.0 (Cloud Edition)',
        author: 'catira3132@mail.com'
    });
});

// ============================================
// MANEJO DE ERRORES Y RUTAS NO ENCONTRADAS
// ============================================

/**
 * CAPTURA DE ERROR 404 (Not Found)
 * Este middleware se ejecuta si ninguna de las rutas anteriores coincidió con la URL pedida.
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'La ruta solicitada no existe en el ecosistema Passly'
    });
});

/**
 * MANEJADOR GLOBAL DE EXCEPCIONES (Internal Server Error 500)
 * Si ocurre un error inesperado en cualquier parte del código, este middleware lo atrapa.
 * [ESTRATEGIA DE ESTUDIO]: Centralizar los errores evita que el servidor se caiga (crash)
 * y permite registrar el error para su posterior análisis sin exponer detalles técnicos al usuario final.
 */
app.use((err, req, res, next) => {
    console.error('💣 ERROR CRÍTICO DETECTADO:', err.message);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error técnico interno en el procesamiento de la solicitud',
        // En modo desarrollo, enviamos el 'stack' para que el programador vea exactamente dónde falló
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
