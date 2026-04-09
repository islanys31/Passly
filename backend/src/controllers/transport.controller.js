const { pool: db } = require('../config/db');
const { logAction } = require('../utils/logger');

exports.getAllTransports = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM medios_transporte');
        res.json({ ok: true, data: rows });
    } catch (error) {
        console.warn('⚠️ Transport fallback active (Demo Data)');
        const demoTransports = [
            { id: 1, nombre: 'Automóvil', descripcion: 'Vehículo ligero de 4 ruedas', estado_id: 1 },
            { id: 2, nombre: 'Motocicleta', descripcion: 'Vehículo de 2 ruedas', estado_id: 1 },
            { id: 3, nombre: 'Camioneta', descripcion: 'Vehículo de carga ligera', estado_id: 1 },
            { id: 4, nombre: 'Bicicleta', descripcion: 'Vehículo no motorizado', estado_id: 1 }
        ];
        res.json({ ok: true, data: demoTransports, isDemo: true });
    }
};

exports.createTransport = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) return res.status(400).json({ ok: false, error: 'El nombre es obligatorio' });

        const [result] = await db.query(
            'INSERT INTO medios_transporte (nombre, descripcion, estado_id) VALUES (?, ?, ?)',
            [nombre, descripcion || null, 1]
        );

        // Audit Log
        await logAction(req.user.id, 'Crear Transporte', 'Sistema', { nombre }, req.ip);

        res.status(201).json({ ok: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.updateTransport = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, estado_id } = req.body;

        await db.query(
            'UPDATE medios_transporte SET nombre = ?, descripcion = ?, estado_id = ? WHERE id = ?',
            [nombre, descripcion, estado_id || 1, id]
        );

        // Audit Log
        await logAction(req.user.id, 'Actualizar Transporte', 'Sistema', { transport_id: id, nombre }, req.ip);

        res.json({ ok: true, message: 'Transporte actualizado' });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.deleteTransport = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete
        await db.query('UPDATE medios_transporte SET estado_id = 2 WHERE id = ?', [id]);

        // Audit Log
        await logAction(req.user.id, 'Desactivar Transporte', 'Sistema', { transport_id: id }, req.ip);

        res.json({ ok: true, message: 'Transporte eliminado (soft delete)' });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
