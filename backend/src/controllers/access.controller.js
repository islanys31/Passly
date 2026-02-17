const { pool: db } = require('../config/db');

exports.getAllAccess = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido, d.nombre as dispositivo_nombre 
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            ORDER BY a.fecha_hora DESC
        `);
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.logAccess = async (req, res) => {
    try {
        const { usuario_id, dispositivo_id, tipo } = req.body;
        const [result] = await db.query(
            'INSERT INTO accesos (usuario_id, dispositivo_id, tipo) VALUES (?, ?, ?)',
            [usuario_id || req.user.id, dispositivo_id || null, tipo || 'Entrada']
        );

        const io = require('../config/socket').getIO();
        io.emit('new_access', { id: result.insertId, tipo });
        io.emit('stats_update');

        res.status(201).json({ ok: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
