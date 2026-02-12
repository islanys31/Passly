const { pool: db } = require('../config/db');
const { getIO } = require('../config/socket');

exports.getAllAccessLogs = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT a.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido, d.nombre as dispositivo_nombre 
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            ORDER BY a.fecha_hora DESC
        `);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener registros de acceso' });
    }
};

exports.registerAccess = async (req, res) => {
    try {
        const { usuario_id, dispositivo_id, tipo, observaciones } = req.body;
        const [result] = await db.query(
            'INSERT INTO accesos (usuario_id, dispositivo_id, tipo, observaciones) VALUES (?, ?, ?, ?)',
            [usuario_id, dispositivo_id, tipo, observaciones]
        );

        // Obtener datos completos para notificar via WebSockets
        const [newLog] = await db.query(`
            SELECT a.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido, d.nombre as dispositivo_nombre 
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            WHERE a.id = ?
        `, [result.insertId]);

        // Emitir evento en tiempo real
        const io = getIO();
        io.emit('new_access', newLog[0]);

        res.status(201).json({ id: result.insertId, message: 'Acceso registrado', data: newLog[0] });
    } catch (error) {
        console.error('Error al registrar acceso:', error);
        res.status(500).json({ error: 'Error al registrar acceso' });
    }
};
