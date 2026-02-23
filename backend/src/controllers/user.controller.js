const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');
const { logAction } = require('../utils/logger');

exports.getAllUsers = async (req, res) => {
    try {
        // Multi-tenant: Filtrar por cliente_id del administrador
        const [rows] = await db.query('SELECT id, nombre, apellido, email, rol_id, estado_id, foto_url, created_at FROM usuarios WHERE cliente_id = ?', [req.user.cliente_id]);
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Error al obtener usuarios' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, nombre, apellido, email, rol_id, estado_id, foto_url, mfa_enabled FROM usuarios WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        res.json({ ok: true, user: users[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { nombre, apellido, email, password, rol_id } = req.body;
        const tenantId = req.user.cliente_id;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, rol_id, cliente_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [nombre, apellido, email, hashedPassword, rol_id, tenantId]
        );

        // Audit Log
        await logAction(req.user.id, 'Crear Usuario', 'Usuarios', { email, rol_id }, req.ip);

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
        const tenantId = req.user.cliente_id;

        // Verificar que el usuario a editar pertenece al mismo cliente
        const [target] = await db.query('SELECT cliente_id FROM usuarios WHERE id = ?', [id]);
        if (target.length === 0 || target[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'Acceso denegado a este recurso' });
        }

        await db.query(
            'UPDATE usuarios SET nombre=?, apellido=?, email=?, rol_id=?, estado_id=? WHERE id=?',
            [nombre, apellido, email, rol_id, estado_id, id]
        );

        // Audit Log
        await logAction(req.user.id, 'Actualizar Usuario', 'Usuarios', { target_id: id, email }, req.ip);

        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.cliente_id;

        // Verificar que el usuario a eliminar pertenece al mismo cliente
        const [target] = await db.query('SELECT cliente_id FROM usuarios WHERE id = ?', [id]);
        if (target.length === 0 || target[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'Acceso denegado' });
        }

        await db.query('UPDATE usuarios SET estado_id = 2 WHERE id = ?', [id]);

        // Audit Log
        await logAction(req.user.id, 'Eliminar Usuario', 'Usuarios', { target_id: id }, req.ip);

        require('../config/socket').getIO().emit('stats_update');
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'No se subió ninguna imagen' });
        }

        const photoUrl = `/uploads/profiles/${req.file.filename}`;
        const { id } = req.params;
        const tenantId = req.user.cliente_id;

        // Verificar pertenencia
        const [target] = await db.query('SELECT cliente_id FROM usuarios WHERE id = ?', [id]);
        if (target.length === 0 || target[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'No autorizado' });
        }

        await db.query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [photoUrl, id]);

        // Audit Log
        await logAction(req.user.id, 'Subir Foto', 'Usuarios', { target_id: id, photoUrl }, req.ip);

        res.json({ ok: true, photoUrl });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
