const { pool: db } = require('../config/db');

/**
 * RENDIMIENTO: Caché por tenant para las estadísticas del Dashboard.
 * Las stats se recalculan máximo cada 30s por organización.
 * Evita 5 queries paralelas en cada recarga del overview o evento WebSocket.
 */
const statsCache = new Map();
const STATS_TTL_MS = 30 * 1000; // 30 segundos

function getStatsFromCache(tenantId) {
    const entry = statsCache.get(tenantId);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > STATS_TTL_MS) {
        statsCache.delete(tenantId);
        return null;
    }
    return entry.stats;
}

exports.getGeneralStats = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const userId = req.user.id;
        const roleId = req.user.rol_id;

        // Cache HIT → responder sin tocar la BD (solo para admin/seguridad)
        const cacheKey = roleId === 2 ? `user_${userId}` : `tenant_${tenantId}`;
        const cached = getStatsFromCache(cacheKey);
        if (cached) {
            return res.json({ success: true, stats: cached, fromCache: true });
        }

        let stats = {};

        if (roleId === 2) {
            const [accessRes, techRes, vehicleRes] = await Promise.all([
                db.query(`
                    SELECT COUNT(*) as total FROM accesos
                    WHERE usuario_id = ? AND DATE(fecha_hora) = CURDATE()
                `, [userId]),
                db.query(`
                    SELECT COUNT(*) as total FROM equipos
                    WHERE usuario_id = ? AND estado_id = 1
                `, [userId]),
                db.query(`
                    SELECT COUNT(*) as total FROM dispositivos
                    WHERE usuario_id = ? AND estado_id = 1 AND medio_transporte_id IS NOT NULL
                `, [userId])
            ]);
            stats = {
                users: 1,
                accessToday: accessRes[0][0].total,
                tech: techRes[0][0].total,
                vehicles: vehicleRes[0][0].total,
                alerts: 0
            };
        } else {
            const [usersRes, accessRes, techRes, vehicleRes, blockedRes] = await Promise.all([
                db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 1 AND cliente_id = ?', [tenantId]),
                db.query(`
                    SELECT COUNT(*) as total FROM accesos a
                    JOIN usuarios u ON a.usuario_id = u.id
                    WHERE DATE(a.fecha_hora) = CURDATE() AND u.cliente_id = ?
                `, [tenantId]),
                db.query(`
                    SELECT COUNT(*) as total FROM equipos e
                    JOIN usuarios u ON e.usuario_id = u.id
                    WHERE e.estado_id = 1 AND u.cliente_id = ?
                `, [tenantId]),
                db.query(`
                    SELECT COUNT(*) as total FROM dispositivos d
                    JOIN usuarios u ON d.usuario_id = u.id
                    WHERE d.estado_id = 1 AND d.medio_transporte_id IS NOT NULL AND u.cliente_id = ?
                `, [tenantId]),
                db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 4 AND cliente_id = ?', [tenantId])
            ]);

            stats = {
                users: usersRes[0][0].total,
                accessToday: accessRes[0][0].total,
                tech: techRes[0][0].total,
                vehicles: vehicleRes[0][0].total,
                alerts: blockedRes[0][0].total
            };
        }

        // Guardar en caché para los próximos 30s
        statsCache.set(cacheKey, { stats, cachedAt: Date.now() });

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};

/**
 * Endpoint dedicado para el gráfico de tráfico por hora del día.
 * Reemplaza el uso de /api/accesos (que ahora es paginado) para el overview.
 * Devuelve los últimos 200 accesos para calcular la distribución horaria.
 * @route GET /api/stats/traffic
 */
exports.getTrafficByHour = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const userId = req.user.id;
        const roleId = req.user.rol_id;

        let query = '';
        let params = [];

        if (roleId === 2) {
            query = `
                SELECT fecha_hora
                FROM accesos
                WHERE usuario_id = ?
                ORDER BY fecha_hora DESC
                LIMIT 200
            `;
            params = [userId];
        } else {
            query = `
                SELECT a.fecha_hora
                FROM accesos a
                JOIN usuarios u ON a.usuario_id = u.id
                WHERE u.cliente_id = ?
                ORDER BY a.fecha_hora DESC
                LIMIT 200
            `;
            params = [tenantId];
        }

        const [rows] = await db.query(query, params);

        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

