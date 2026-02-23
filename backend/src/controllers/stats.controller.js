const { pool: db } = require('../config/db');

exports.getGeneralStats = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;

        const [usersRes, accessRes, devicesRes, blockedRes] = await Promise.all([
            db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 1 AND cliente_id = ?', [tenantId]),
            db.query(`
                SELECT COUNT(*) as total FROM accesos a
                JOIN usuarios u ON a.usuario_id = u.id
                WHERE DATE(a.fecha_hora) = CURDATE() AND u.cliente_id = ?
            `, [tenantId]),
            db.query(`
                SELECT COUNT(*) as total FROM dispositivos d
                JOIN usuarios u ON d.usuario_id = u.id
                WHERE d.estado_id = 1 AND u.cliente_id = ?
            `, [tenantId]),
            db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 4 AND cliente_id = ?', [tenantId])
        ]);

        res.json({
            success: true,
            stats: {
                users: usersRes[0][0].total,
                accessToday: accessRes[0][0].total,
                devices: devicesRes[0][0].total,
                alerts: blockedRes[0][0].total
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};
