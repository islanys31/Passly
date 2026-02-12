const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Rate Limiting - Prevenir ataques de fuerza bruta
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por IP
    message: 'Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 registros por IP por hora
    message: 'Demasiados registros desde esta IP. Por favor, intenta de nuevo más tarde.',
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP
    message: 'Demasiadas peticiones desde esta IP. Por favor, intenta de nuevo más tarde.',
});

// Configuración de Helmet para headers de seguridad
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
});

// Validadores de inputs
const validateRegister = [
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'),

    body('rol')
        .optional()
        .isIn(['admin', 'usuario'])
        .withMessage('Rol inválido'),
];

const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida'),
];

const validateDevice = [
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('tipo')
        .trim()
        .isIn(['laptop', 'tablet', 'smartphone', 'otro'])
        .withMessage('Tipo de dispositivo inválido'),

    body('marca')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('La marca no puede exceder 50 caracteres'),

    body('modelo')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('El modelo no puede exceder 50 caracteres'),
];

const validateAccess = [
    body('usuario_id')
        .isInt({ min: 1 })
        .withMessage('ID de usuario inválido'),

    body('dispositivo_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID de dispositivo inválido'),

    body('medio_transporte_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID de medio de transporte inválido'),

    body('tipo_acceso')
        .isIn(['entrada', 'salida'])
        .withMessage('Tipo de acceso inválido'),
];

// Middleware para manejar errores de validación
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

// Sanitización de inputs (prevenir XSS)
const sanitizeInput = (req, res, next) => {
    // Sanitizar body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key]
                    .replace(/[<>]/g, '') // Remover < y >
                    .trim();
            }
        });
    }
    next();
};

module.exports = {
    loginLimiter,
    registerLimiter,
    apiLimiter,
    helmetConfig,
    validateRegister,
    validateLogin,
    validateDevice,
    validateAccess,
    handleValidationErrors,
    sanitizeInput,
};
