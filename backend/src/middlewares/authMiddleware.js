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
    // 1. Obtener el token de la cabecera 'authorization'
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'Acceso denegado: No se proporcionó un token de seguridad' });
    }

    try {
        // 2. Extraer el token después de la palabra 'Bearer'
        const bearer = token.split(' ');
        const bearerToken = bearer[1];

        // 3. SEGURIDAD: Verificar la firma del JWT con la clave secreta del servidor
        const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);

        /**
         * 4. HARDENING: Validación de Propósito.
         * Evitamos que un token generado para 'recuperación de contraseña' sea usado 
         * para navegar por el Dashboard. Cada token debe tener un fin específico.
         */
        if (decoded.purpose === 'password_reset') {
            return res.status(401).json({ error: 'No autorizado: El propósito del token es inválido para esta ruta' });
        }

        /**
         * 5. HARDENING: Validación de Estado en tiempo real.
         * Incluso si el token es válido, consultamos la BD para asegurar que el usuario 
         * NO haya sido suspendido o eliminado recientemente.
         */
        const { pool: db } = require('../config/db');
        const [users] = await db.query('SELECT estado_id FROM usuarios WHERE id = ?', [decoded.id]);

        if (users.length === 0 || users[0].estado_id !== 1) {
            return res.status(401).json({ error: 'No autorizado: Cuenta inactiva o inexistente' });
        }

        // 6. Si todo está bien, guardamos la info decodificada en req.user para usarla en los controladores
        req.user = decoded;
        next(); // Permitir que la petición continúe al siguiente paso (controlador)
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
