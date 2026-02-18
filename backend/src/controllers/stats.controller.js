const { pool: db } = require('../config/db');

exports.getGeneralStats = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;

        // Usuarios activos del cliente
        const [users] = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 1 AND cliente_id = ?', [tenantId]);

        // Accesos hoy (filtrando por usuarios del cliente)
        const [accesos] = await db.query(`
            SELECT COUNT(*) as total FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE DATE(a.fecha_hora) = CURDATE() AND u.cliente_id = ?
        `, [tenantId]);

        // Dispositivos activos (filtrando por usuarios del cliente)
        const [dispositivos] = await db.query(`
            SELECT COUNT(*) as total FROM dispositivos d
            JOIN usuarios u ON d.usuario_id = u.id
            WHERE d.estado_id = 1 AND u.cliente_id = ?
        `, [tenantId]);

        // Alertas: Usuarios bloqueados del cliente
        const [bloqueados] = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 4 AND cliente_id = ?', [tenantId]);
        const alerts = bloqueados[0].total;

        res.json({
            success: true,
            stats: {
                usuariosActivos: users[0].total,
                accesosHoy: accesos[0].total,
                dispositivosActivos: dispositivos[0].total,
                alertas: alerts
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};
