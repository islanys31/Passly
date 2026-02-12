const { pool: db } = require('../config/db');

exports.getAllDevices = async (req, res) => {
    try {
        const [devices] = await db.query(`
            SELECT d.*, u.nombre as usuario_nombre, mt.nombre as medio_transporte 
            FROM dispositivos d
            JOIN usuarios u ON d.usuario_id = u.id
            JOIN medios_transporte mt ON d.medio_transporte_id = mt.id
        `);
        res.json(devices);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener dispositivos' });
    }
};

exports.createDevice = async (req, res) => {
    try {
        const { usuario_id, medio_transporte_id, nombre, identificador_unico } = req.body;
        const [result] = await db.query(
            'INSERT INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id) VALUES (?, ?, ?, ?, 1)',
            [usuario_id, medio_transporte_id, nombre, identificador_unico]
        );
        res.status(201).json({ id: result.insertId, message: 'Dispositivo registrado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar dispositivo' });
    }
};

exports.updateDevice = async (req, res) => {
    try {
        const { nombre, identificador_unico, estado_id } = req.body;
        await db.query(
            'UPDATE dispositivos SET nombre = ?, identificador_unico = ?, estado_id = ? WHERE id = ?',
            [nombre, identificador_unico, estado_id, req.params.id]
        );
        res.json({ message: 'Dispositivo actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar dispositivo' });
    }
};

exports.deleteDevice = async (req, res) => {
    try {
        await db.query('UPDATE dispositivos SET estado_id = 2 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Dispositivo desactivado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al desactivar dispositivo' });
    }
};
