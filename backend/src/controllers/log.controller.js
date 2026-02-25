const { pool: db } = require('../config/db');
const { getPagination, paginatedResponse } = require('../utils/pagination');

exports.getAuditLogs = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const { page, limit, offset } = getPagination(req.query, 50, 200);

        const [[{ total }]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM logs_sistema l
            LEFT JOIN usuarios u ON l.usuario_id = u.id
            WHERE (u.cliente_id = ? OR l.usuario_id IS NULL)
        `, [tenantId]);

        // Los admins ven logs de su organización y logs del sistema asociados
        const [rows] = await db.query(`
            SELECT l.*, u.nombre, u.apellido, u.email, u.foto_url
            FROM logs_sistema l
            LEFT JOIN usuarios u ON l.usuario_id = u.id
            WHERE (u.cliente_id = ? OR l.usuario_id IS NULL)
            ORDER BY l.fecha_hora DESC
            LIMIT ? OFFSET ?
        `, [tenantId, limit, offset]);

        res.json(paginatedResponse(rows, total, page, limit));
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
