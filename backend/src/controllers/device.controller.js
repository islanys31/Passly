const { pool: db } = require('../config/db');

exports.getAllDevices = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.*, u.nombre as usuario_nombre, m.nombre as medio_transporte
            FROM dispositivos d
            LEFT JOIN usuarios u ON d.usuario_id = u.id
            LEFT JOIN medios_transporte m ON d.medio_transporte_id = m.id
        `);
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.createDevice = async (req, res) => {
    try {
        const { usuario_id, medio_transporte_id, nombre, identificador_unico } = req.body;
        const [result] = await db.query(
            'INSERT INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id) VALUES (?, ?, ?, ?, 1)',
            [usuario_id, medio_transporte_id, nombre, identificador_unico]
        );
        require('../config/socket').getIO().emit('stats_update');
        res.status(201).json({ ok: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id } = req.body;
        await db.query(
            'UPDATE dispositivos SET usuario_id=?, medio_transporte_id=?, nombre=?, identificador_unico=?, estado_id=? WHERE id=?',
            [usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id, id]
        );
        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE dispositivos SET estado_id = 2 WHERE id = ?', [id]);
        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
