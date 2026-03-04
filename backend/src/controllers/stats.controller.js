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

        // Cache HIT → responder sin tocar la BD
        const cached = getStatsFromCache(tenantId);
        if (cached) {
            return res.json({ success: true, stats: cached, fromCache: true });
        }

        // Cache MISS → ejecutar las 5 queries en paralelo
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

        const stats = {
            users: usersRes[0][0].total,
            accessToday: accessRes[0][0].total,
            tech: techRes[0][0].total,
            vehicles: vehicleRes[0][0].total,
            alerts: blockedRes[0][0].total
        };

        // Guardar en caché para los próximos 30s
        statsCache.set(tenantId, { stats, cachedAt: Date.now() });

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

        const [rows] = await db.query(`
            SELECT a.fecha_hora, a.tipo, u.nombre as usuario_nombre, u.foto_url as usuario_foto
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE u.cliente_id = ?
            ORDER BY a.fecha_hora DESC
            LIMIT 200
        `, [tenantId]);

        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.getAdvancedStats = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;

        // 1. Accesos de los últimos 7 días
        const [weekly] = await db.query(`
            SELECT DATE(fecha_hora) as date, COUNT(*) as count 
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE u.cliente_id = ? AND fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(fecha_hora)
            ORDER BY DATE(fecha_hora) ASC
        `, [tenantId]);

        // 2. Accesos por medio de transporte (JOIN dispositivos + medios_transporte)
        const [byTransport] = await db.query(`
            SELECT mt.nombre as label, COUNT(a.id) as value
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            LEFT JOIN medios_transporte mt ON d.medio_transporte_id = mt.id
            WHERE u.cliente_id = ?
            GROUP BY mt.nombre
        `, [tenantId]);

        // 3. Usuarios por rol
        const [byRole] = await db.query(`
            SELECT r.nombre_rol as label, COUNT(u.id) as value
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.cliente_id = ?
            GROUP BY r.nombre_rol
        `, [tenantId]);

        res.json({
            ok: true,
            data: {
                weekly,
                byTransport,
                byRole
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

