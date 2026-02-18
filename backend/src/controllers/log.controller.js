const { pool: db } = require('../config/db');

exports.getAuditLogs = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;

        // Los admins solo ven logs de su organización (usuarios que pertenecen a su cliente_id)
        const [rows] = await db.query(`
            SELECT l.*, u.nombre, u.apellido, u.email 
            FROM logs_sistema l
            JOIN usuarios u ON l.usuario_id = u.id
            WHERE u.cliente_id = ?
            ORDER BY l.fecha_hora DESC
            LIMIT 200
        `, [tenantId]);

        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
