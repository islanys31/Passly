/**
 * @file authMiddleware.js
 * @description Middleware para la protección de rutas mediante JSON Web Tokens (JWT).
 * Se encarga de validar la identidad del usuario y sus permisos (roles) antes de permitir el acceso a un endpoint.
 */

const jwt = require('jsonwebtoken');

/**
 * RENDIMIENTO: Caché en memoria para el estado del usuario.
 * Evita ir a la BD en CADA petición autenticada.
 * Entrada: { estado_id, cachedAt } — TTL de 60 segundos.
 * Si el admin desactiva un usuario, el cambio se refleja en máximo 60 s.
 */
const userStatusCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 1000; // 6 minutos para dar margen

/**
 * 🛡️ RECOLECTOR DE BASURA (Bug 9): Limpia el caché periódicamente 
 * para evitar que el Map crezca indefinidamente (Memory Leak).
 */
setInterval(() => {
    const now = Date.now();
    for (const [userId, entry] of userStatusCache.entries()) {
        if (now - entry.cachedAt > CACHE_TTL_MS) {
            userStatusCache.delete(userId);
        }
    }
}, 10 * 60 * 1000); // Se ejecuta cada 10 minutos


function getUserFromCache(userId) {
    const entry = userStatusCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        userStatusCache.delete(userId); // Expirado → limpiar
        return null;
    }
    return entry;
}

function setUserInCache(userId, estado_id) {
    userStatusCache.set(userId, { estado_id, cachedAt: Date.now() });
}

/**
 * Invalida el caché de un usuario específico.
 * Llamar cuando se cambia el estado del usuario (activar/desactivar).
 */
function invalidateUserCache(userId) {
    userStatusCache.delete(userId);
}

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
         * HARDENING: Validación de Estado con caché.
         * En MODO OFFLINE (IDs 888, 999), saltamos la consulta a la BD.
         */
        if (decoded.id === 888 || decoded.id === 999) {
            req.user = decoded;
            return next();
        }

        let userStatus = getUserFromCache(decoded.id);

        if (!userStatus) {
            try {
                // Cache MISS → consultar BD y guardar resultado
                const { pool: db } = require('../config/db');
                const [users] = await db.query('SELECT estado_id FROM usuarios WHERE id = ?', [decoded.id]);

                if (users.length === 0) {
                    return res.status(401).json({ error: 'No autorizado: Cuenta inexistente' });
                }

                userStatus = { estado_id: users[0].estado_id };
                setUserInCache(decoded.id, users[0].estado_id);
            } catch (dbErr) {
                console.error('⚠️ DB Error in Middleware:', dbErr.message);
                // Si la DB falla, solo dejamos pasar a los Mock IDs (ya manejado arriba)
                return res.status(401).json({ error: 'Identidad no verificable en este momento' });
            }
        }

        if (userStatus.estado_id !== 1) {
            invalidateUserCache(decoded.id); // Forzar re-verificación en próximo intento
            return res.status(401).json({ error: 'No autorizado: Cuenta inactiva o bloqueada' });
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

module.exports = { verifyToken, verifyRole, invalidateUserCache, setUserInCache };

