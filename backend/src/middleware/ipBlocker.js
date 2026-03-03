/**
 * @file ipBlocker.js
 * @description Mecanismo de defensa contra ataques de Fuerza Bruta.
 * Este middleware protege los endpoints de autenticación bloqueando direcciones IP
 * que excedan un número máximo de intentos fallidos en un periodo de tiempo.
 */

const { pool: db } = require('../config/db');

/**
 * Middleware que verifica si la IP del solicitante está bajo bloqueo temporal.
 * Se aplica habitualmente en las rutas de Login y Recuperación de Contraseña.
 */
const ipBlocker = async (req, res, next) => {
    const ip = req.ip; // Identificador del cliente

    // WHITELIST: No bloquear localhost
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
        return next();
    }

    // 🛡️ COHERENCIA: max 5 intentos / 15 minutos (Bug 1)
    const blockTimeMinutes = 15;
    const maxAttempts = 5;


    try {
        // Consultar el historial de intentos para esta dirección IP
        const [rows] = await db.query(
            'SELECT attempts, last_attempt FROM login_attempts WHERE ip_address = ?',
            [ip]
        );

        if (rows.length > 0) {
            const { attempts, last_attempt } = rows[0];
            const now = new Date();
            const timeDiff = (now - new Date(last_attempt)) / 1000 / 60; // Diferencia en minutos

            /**
             * REGLA DE BLOQUEO: 
             * Si ha superado el máximo de intentos y el último intento fue hace 
             * menos de 'blockTimeMinutes' minutos, rechazamos la petición.
             */
            if (attempts >= maxAttempts && timeDiff < blockTimeMinutes) {
                const waitTime = Math.ceil(blockTimeMinutes - timeDiff);
                return res.status(429).json({
                    error: `⚠️ Seguridad: Demasiados intentos fallidos. Su IP está bloqueada temporalmente. Intente de nuevo en ${waitTime} minutos.`
                });
            }
        }

        // Si no está bloqueado, permitimos que pase al siguiente middleware o controlador
        next();
    } catch (error) {
        console.error('❌ Error en el sistema de IP Blocker:', error);
        next(); // En caso de fallo crítico del sistema de seguridad, dejamos pasar para no romper el servicio
    }
};

/**
 * Registra o incrementa un intento fallido para una IP específica.
 * Se llama desde el controlador cuando las credenciales no coinciden.
 * 
 * @param {string} ip - IP a penalizar
 */
const trackFailedAttempt = async (ip) => {
    try {
        await db.query(`
            INSERT INTO login_attempts (ip_address, attempts, last_attempt) 
            VALUES (?, 1, NOW())
            ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt = NOW()
        `, [ip]);
    } catch (error) {
        console.error('Error al rastrear intento fallido:', error);
    }
};

/**
 * Elimina el registro de penalización para una IP.
 * Se llama cuando un usuario logra autenticarse exitosamente, 
 * reseteando su 'historial criminal' desde esa IP.
 * 
 * @param {string} ip - IP a perdonar
 */
const resetAttempts = async (ip) => {
    try {
        await db.query('DELETE FROM login_attempts WHERE ip_address = ?', [ip]);
    } catch (error) {
        console.error('Error al resetear intentos de IP:', error);
    }
};

module.exports = { ipBlocker, trackFailedAttempt, resetAttempts };
