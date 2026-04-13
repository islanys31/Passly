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

        // Cache HIT → responder sin tocar la BD
        const cacheKey = roleId === 2 ? `user_${userId}` : `tenant_${tenantId}`;
        const cached = getStatsFromCache(cacheKey);
        if (cached) {
            return res.json({ success: true, stats: cached, fromCache: true });
        }

        let stats = {};

        // Helper: query con timeout de 3 segundos para evitar bloqueos
        const safeQuery = async (sql, params) => {
            try {
                const [rows] = await Promise.race([
                    db.query(sql, params),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 3000))
                ]);
                return rows[0]?.total ?? 0;
            } catch (e) {
                console.warn('⚠️ Stats query fallback (0):', e.message);
                return 0;
            }
        };

        if (roleId === 2) {
            // Residente: solo sus propios datos
            const [accessToday, tech, vehicles] = await Promise.all([
                safeQuery('SELECT COUNT(*) as total FROM accesos WHERE usuario_id = ? AND DATE(fecha_hora) = CURDATE()', [userId]),
                safeQuery('SELECT COUNT(*) as total FROM equipos WHERE usuario_id = ? AND estado_id = 1', [userId]),
                safeQuery('SELECT COUNT(*) as total FROM dispositivos WHERE usuario_id = ? AND estado_id = 1', [userId])
            ]);
            stats = { users: 1, accessToday, tech, vehicles, alerts: 0 };
        } else {
            // Admin/Seguridad: datos globales filtrados por sede
            const [users, accessToday, tech, vehicles, alerts] = await Promise.all([
                safeQuery('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 1 AND cliente_id = ?', [tenantId]),
                safeQuery('SELECT COUNT(*) as total FROM accesos a JOIN usuarios u ON a.usuario_id = u.id WHERE DATE(a.fecha_hora) = CURDATE() AND u.cliente_id = ?', [tenantId]),
                safeQuery('SELECT COUNT(*) as total FROM equipos e JOIN usuarios u ON e.usuario_id = u.id WHERE e.estado_id = 1 AND u.cliente_id = ?', [tenantId]),
                safeQuery('SELECT COUNT(*) as total FROM dispositivos d JOIN usuarios u ON d.usuario_id = u.id WHERE d.estado_id = 1 AND u.cliente_id = ?', [tenantId]),
                safeQuery('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 4 AND cliente_id = ?', [tenantId])
            ]);
            stats = { users, accessToday, tech, vehicles, alerts };
        }

        statsCache.set(cacheKey, { stats, cachedAt: Date.now() });
        res.json({ success: true, stats });
    } catch (error) {
        console.warn('⚠️ Stats fallback active (Demo Data):', error.message);
        // Fallback: devolver datos de demo (INSTRUCCIONES_DEMO.md) para que el gráfico no se vea vacío
        const demoStats = roleId === 2 
            ? { users: 1, accessToday: 12, tech: 3, vehicles: 2, alerts: 0 }
            : { users: 125, accessToday: 312, tech: 84, vehicles: 47, alerts: 3 };
        res.json({ success: true, stats: demoStats, isDemo: true });
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
        const userId = req.user.id;
        const roleId = req.user.rol_id;

        let query = '';
        let params = [];

        if (roleId === 2) {
            query = 'SELECT fecha_hora FROM accesos WHERE usuario_id = ? ORDER BY fecha_hora DESC LIMIT 200';
            params = [userId];
        } else {
            // Simplificado: sin JOIN para evitar bloqueos
            query = 'SELECT fecha_hora FROM accesos ORDER BY fecha_hora DESC LIMIT 200';
            params = [];
        }

        const [rows] = await Promise.race([
            db.query(query, params),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Traffic query timeout')), 3000))
        ]);

        res.json({ ok: true, data: rows });
    } catch (error) {
        console.warn('⚠️ Traffic fallback:', error.message);
        res.json({ ok: true, data: [] });
    }
};



/**
 * Endpoint for advanced analytics (currently a placeholder for stability).
 * @route GET /api/stats/advanced
 */
exports.getAdvancedStats = async (req, res) => {
    try {
        const demoData = {
            weekly: [
                { date: 'Lun', count: 45 }, { date: 'Mar', count: 52 }, { date: 'Mie', count: 38 },
                { date: 'Jue', count: 65 }, { date: 'Vie', count: 48 }, { date: 'Sab', count: 20 }, { date: 'Dom', count: 12 }
            ],
            byTransport: [
                { label: 'Automóvil', value: 65 }, { label: 'Moto', value: 25 }, { label: 'Peatonal', value: 10 }
            ],
            byRole: [
                { label: 'Admin', value: 5 }, { label: 'Residente', value: 85 }, { label: 'Seguridad', value: 10 }
            ]
        };
        res.json({ ok: true, data: { data: demoData } });
    } catch (error) {
        console.error('Error in getAdvancedStats:', error);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
};
