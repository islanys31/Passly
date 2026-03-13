const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

const skipLocalhost = (req) => {
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
    return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
};

/**
 * SEGURIDAD — Fuerza Bruta en Login.
 * 5 intentos máximo por ventana de 15 minutos.
 * Estándar OWASP para protección de endpoints de autenticación.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: skipLocalhost
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Demasiados registros desde esta IP. Por favor, intenta de nuevo más tarde.',
    skip: skipLocalhost
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Has alcanzado el límite de 3 solicitudes de recuperación por hora. Por favor, intenta más tarde.',
    skip: skipLocalhost
});

/**
 * Rate limiter general para la API.
 * 200 req/15min es razonable para uso normal del dashboard (paginación, navegación, etc).
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Demasiadas peticiones desde esta IP. Por favor, intenta de nuevo más tarde.',
    skipSuccessfulRequests: false,
    // WHITELIST: No limitar peticiones desde localhost para facilitar el desarrollo
    skip: skipLocalhost
});


const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
        },
    },
    // SEGURIDAD: Solo activar HSTS si HTTPS está habilitado explícitamente (evita fallos en localhost)
    hsts: (process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true') ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    } : false,
});

const validateRegister = [
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZÁÉÍÓÚÑáéíóúñ\s]+$/)
        .withMessage('El nombre contiene caracteres no permitidos'),

    body('apellido')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZÁÉÍÓÚÑáéíóúñ\s]+$/)
        .withMessage('El apellido contiene caracteres no permitidos'),

    body('email')
        .trim()
        .toLowerCase()
        .isEmail()
        .withMessage('El formato del correo no es válido')
        .custom(value => {
            if (/[A-Z]/.test(value)) throw new Error('El correo debe estar en minúsculas');
            return true;
        }),

    body('password')
        .isLength({ min: 8, max: 12 })
        .withMessage('La contraseña debe tener entre 8 y 12 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]+$/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y NO debe contener caracteres especiales'),

    body('rol_id')
        .notEmpty()
        .isInt()
        .withMessage('ID de rol inválido'),
];

const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido'),

    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida'),

    body('rol_id')
        .notEmpty()
        .withMessage('El rol es obligatorio')
        .isInt()
        .withMessage('ID de rol inválido'),
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

const sanitizeInput = (req, res, next) => {
    /**
     * SEGURIDAD: Sanitización completa de todos los vectores de entrada.
     * Antes solo se limpiaba req.body — req.query y req.params quedaban expuestos.
     * Ahora los tres pasan por el mismo filtro: elimina < > y hace trim().
     */
    const sanitizeObject = (obj) => {
        if (!obj) return;
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].replace(/[<>]/g, '').trim();
            }
        });
    };

    sanitizeObject(req.body);
    sanitizeObject(req.query);
    sanitizeObject(req.params);

    next();
};

module.exports = {
    loginLimiter,
    registerLimiter,
    forgotPasswordLimiter,
    apiLimiter,
    helmetConfig,
    validateRegister,
    validateLogin,
    handleValidationErrors,
    sanitizeInput,
};
