const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: 'Demasiados registros desde esta IP. Por favor, intenta de nuevo más tarde.',
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Has alcanzado el límite de 3 solicitudes de recuperación por hora. Por favor, intenta más tarde.',
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiadas peticiones desde esta IP. Por favor, intenta de nuevo más tarde.',
});

const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
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
        .custom(value => {
            if (/[A-Z]/.test(value)) throw new Error('El correo debe estar en minúsculas');
            const regex = /^[a-z0-9._%+-]+@(gmail|hotmail)\.[a-z]{2,}(\.[a-z]{2,})?$/;
            if (!regex.test(value)) throw new Error('Solo se permiten correos @gmail.com o @hotmail.com');
            return true;
        }),

    body('password')
        .isLength({ min: 8, max: 12 })
        .withMessage('La contraseña debe tener entre 8 y 12 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^*/_.])[A-Za-z\d!@#$%^*/_.]+$/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (!@#$%^*/_.)'),

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
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key]
                    .replace(/[<>]/g, '')
                    .trim();
            }
        });
    }
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
