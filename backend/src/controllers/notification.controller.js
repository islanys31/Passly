const { pool: db } = require('../config/db');

exports.getNotifications = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        // Obtenemos los últimos 10 logs de auditoría o accesos según el rol
        let query = '';
        let params = [];
        
        if (req.user.rol_id === 1 || req.user.rol_id === 4) {
            query = 'SELECT * FROM accesos a JOIN usuarios u ON a.usuario_id = u.id WHERE u.cliente_id = ? ORDER BY a.fecha_hora DESC LIMIT 10';
            params = [tenantId];
        } else {
            query = 'SELECT * FROM accesos WHERE usuario_id = ? ORDER BY fecha_hora DESC LIMIT 10';
            params = [req.user.id];
        }
        
        const [notifications] = await db.query(query, params);
        res.json({ ok: true, data: notifications });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Fallo al obtener notificaciones' });
    }
};
