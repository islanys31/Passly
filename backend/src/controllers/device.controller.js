const { pool: db } = require('../config/db');
const { logAction } = require('../utils/logger');

exports.getAllDevices = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const [rows] = await db.query(`
            SELECT d.*, u.nombre as usuario_nombre, u.foto_url as usuario_foto, m.nombre as medio_transporte
            FROM dispositivos d
            INNER JOIN usuarios u ON d.usuario_id = u.id
            LEFT JOIN medios_transporte m ON d.medio_transporte_id = m.id
            WHERE u.cliente_id = ?
        `, [tenantId]);
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.createDevice = async (req, res) => {
    try {
        const { usuario_id, medio_transporte_id, nombre, identificador_unico } = req.body;
        const tenantId = req.user.cliente_id;

        // Verificar que el usuario al que se le asigna el dispositivo pertenece al mismo cliente
        const [userCheck] = await db.query('SELECT cliente_id FROM usuarios WHERE id = ?', [usuario_id]);
        if (userCheck.length === 0 || userCheck[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'Usuario no pertenece a su organización' });
        }

        const [result] = await db.query(
            'INSERT INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id) VALUES (?, ?, ?, ?, 1)',
            [usuario_id, medio_transporte_id, nombre, identificador_unico]
        );

        // Audit Log
        await logAction(req.user.id, 'Vincular Dispositivo', 'Dispositivos', { nombre, uid: identificador_unico, target_user: usuario_id }, req.ip);

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
        const tenantId = req.user.cliente_id;

        // Verificar pertenencia del dispositivo (via JOIN con usuarios)
        const [deviceCheck] = await db.query(`
            SELECT u.cliente_id FROM dispositivos d 
            JOIN usuarios u ON d.usuario_id = u.id 
            WHERE d.id = ?
        `, [id]);

        if (deviceCheck.length === 0 || deviceCheck[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'No autorizado para editar este dispositivo' });
        }

        await db.query(
            'UPDATE dispositivos SET usuario_id=?, medio_transporte_id=?, nombre=?, identificador_unico=?, estado_id=? WHERE id=?',
            [usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id, id]
        );

        // Audit Log
        await logAction(req.user.id, 'Actualizar Dispositivo', 'Dispositivos', { device_id: id, nombre }, req.ip);

        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.cliente_id;

        const [deviceCheck] = await db.query(`
            SELECT u.cliente_id FROM dispositivos d 
            JOIN usuarios u ON d.usuario_id = u.id 
            WHERE d.id = ?
        `, [id]);

        if (deviceCheck.length === 0 || deviceCheck[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'Acceso denegado' });
        }

        await db.query('UPDATE dispositivos SET estado_id = 2 WHERE id = ?', [id]);

        // Audit Log
        await logAction(req.user.id, 'Desactivar Dispositivo', 'Dispositivos', { device_id: id }, req.ip);

        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
