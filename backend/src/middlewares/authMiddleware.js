/**
 * @file authMiddleware.js
 * @description Middleware para la protección de rutas mediante JSON Web Tokens (JWT).
 * Se encarga de validar la identidad del usuario y sus permisos (roles) antes de permitir el acceso a un endpoint.
 */

const jwt = require('jsonwebtoken');

/**
 * Verifica si el token de autorización enviado es válido.
 * Se espera el formato: "Authorization: Bearer <TOKEN>"
 */
const verifyToken = async (req, res, next) => {
    /**
     * SEGURIDAD: Leer token desde Cookie httpOnly (primera prioridad).
     * Las cookies httpOnly son inaccesibles desde JavaScript del navegador,
     * lo que las hace inmunes a ataques XSS.
     * Como fallback, también se acepta el header Authorization para compatibilidad.
     */
    let bearerToken = req.cookies?.auth_token; // 🍪 Fuente principal: Cookie httpOnly

    if (!bearerToken) {
        // Fallback: Authorization header (Bearer <token>)
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            bearerToken = authHeader.split(' ')[1];
        }
    }

    if (!bearerToken) {
        return res.status(403).json({ error: 'Acceso denegado: No se proporcionó un token de seguridad' });
    }

    try {
        // SEGURIDAD: Verificar la firma del JWT con la clave secreta del servidor
        const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);

        /**
         * HARDENING: Validación de Propósito.
         * Evitamos que un token de 'recuperación de contraseña' se use para
         * acceder al Dashboard. Cada token debe tener un fin específico.
         */
        if (decoded.purpose === 'password_reset') {
            return res.status(401).json({ error: 'No autorizado: El propósito del token es inválido para esta ruta' });
        }

        /**
         * HARDENING: Validación de Estado en tiempo real.
         * Aunque el token sea válido, verificamos en la BD que el usuario
         * no haya sido suspendido o eliminado después de iniciar sesión.
         */
        const { pool: db } = require('../config/db');
        const [users] = await db.query('SELECT estado_id FROM usuarios WHERE id = ?', [decoded.id]);

        if (users.length === 0 || users[0].estado_id !== 1) {
            return res.status(401).json({ error: 'No autorizado: Cuenta inactiva o inexistente' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'No autorizado: Token inválido o expirado' });
    }
};

/**
 * Middleware para restringir el acceso basado en el Rol del usuario.
 * @param {Array<number>} roles - Lista de IDs de roles permitidos (ej: [1] para Admin)
 */
const verifyRole = (roles) => {
    return (req, res, next) => {
        /**
         * Si el rol del usuario (extraído del JWT) no está en la lista permitida, 
         * bloqueamos el acceso con un error 403 (Forbidden).
         */
        if (!req.user || !roles.includes(req.user.rol_id)) {
            return res.status(403).json({ error: 'Acceso denegado: Permisos insuficientes para realizar esta acción' });
        }
        next();
    };
};

module.exports = { verifyToken, verifyRole };
