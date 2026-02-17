const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');

exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM usuarios');
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al obtener usuarios' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { nombre, apellido, email, password, rol_id, cliente_id } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, rol_id, cliente_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [nombre, apellido, email, hashedPassword, rol_id, cliente_id || 1]
        );
        require('../config/socket').getIO().emit('stats_update');
        res.status(201).json({ ok: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, email, rol_id, estado_id } = req.body;
        await db.query(
            'UPDATE usuarios SET nombre=?, apellido=?, email=?, rol_id=?, estado_id=? WHERE id=?',
            [nombre, apellido, email, rol_id, estado_id, id]
        );
        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE usuarios SET estado_id = 2 WHERE id = ?', [id]);
        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
