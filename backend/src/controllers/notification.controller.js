const { pool } = require('../config/db');

const getNotifications = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const [rows] = await pool.query(
            'SELECT * FROM notificaciones WHERE usuario_id = ? OR usuario_id IS NULL ORDER BY fecha_hora DESC LIMIT 20',
            [usuario_id]
        );
        res.json({ ok: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, message: 'Error al obtener notificaciones' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE notificaciones SET leido = 1 WHERE id = ?', [id]);
        res.json({ ok: true, message: 'Notificación marcada como leída' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, message: 'Error al actualizar notificación' });
    }
};

const createNotification = async (req, res) => {
    try {
        const { usuario_id, titulo, mensaje, tipo } = req.body;
        await pool.query(
            'INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)',
            [usuario_id, titulo, mensaje, tipo || 'info']
        );
        res.json({ ok: true, message: 'Notificación creada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, message: 'Error al crear notificación' });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    createNotification
};
