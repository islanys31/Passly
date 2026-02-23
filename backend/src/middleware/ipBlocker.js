const { pool: db } = require('../config/db');

/**
 * Middleware para bloquear IPs tras varios intentos fallidos de login.
 */
const ipBlocker = async (req, res, next) => {
    const ip = req.ip;
    const blockTimeMinutes = 15;
    const maxAttempts = 5;

    try {
        // Limpiar intentos antiguos (opcional, pero ayuda a mantener la tabla limpia)
        // await db.query('DELETE FROM login_attempts WHERE last_attempt < NOW() - INTERVAL 24 HOUR');

        const [rows] = await db.query(
            'SELECT attempts, last_attempt FROM login_attempts WHERE ip_address = ?',
            [ip]
        );

        if (rows.length > 0) {
            const { attempts, last_attempt } = rows[0];
            const now = new Date();
            const timeDiff = (now - new Date(last_attempt)) / 1000 / 60; // diferencia en minutos

            if (attempts >= maxAttempts && timeDiff < blockTimeMinutes) {
                const waitTime = Math.ceil(blockTimeMinutes - timeDiff);
                return res.status(429).json({
                    error: `Demasiados intentos fallidos. Su IP está bloqueada temporalmente. Intente de nuevo en ${waitTime} minutos.`
                });
            }
        }

        next();
    } catch (error) {
        console.error('IP Blocker Error:', error);
        next(); // Continuar si hay error en el bloqueo para no impedir el login legal
    }
};

/**
 * Registra un intento fallido para una IP.
 */
const trackFailedAttempt = async (ip) => {
    try {
        await db.query(`
            INSERT INTO login_attempts (ip_address, attempts, last_attempt) 
            VALUES (?, 1, NOW())
            ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt = NOW()
        `, [ip]);
    } catch (error) {
        console.error('Track Failed Attempt Error:', error);
    }
};

/**
 * Limpia los intentos al tener un login exitoso.
 */
const resetAttempts = async (ip) => {
    try {
        await db.query('DELETE FROM login_attempts WHERE ip_address = ?', [ip]);
    } catch (error) {
        console.error('Reset Attempts Error:', error);
    }
};

module.exports = { ipBlocker, trackFailedAttempt, resetAttempts };
