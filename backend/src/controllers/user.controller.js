const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { logAction } = require('../utils/logger');
const emailService = require('../services/email.service');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { invalidateUserCache } = require('../middlewares/authMiddleware');


exports.getAllUsers = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const { page, limit, offset } = getPagination(req.query, 20, 100);

        // Búsqueda server-side por nombre, apellido o email
        const search = req.query.search ? `%${req.query.search}%` : null;
        const searchFilter = search
            ? 'AND (nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)'
            : '';
        const searchParams = search ? [search, search, search] : [];

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM usuarios WHERE cliente_id = ? ${searchFilter}`,
            [tenantId, ...searchParams]
        );

        const [rows] = await db.query(
            `SELECT id, nombre, apellido, email, rol_id, estado_id, foto_url, created_at
             FROM usuarios WHERE cliente_id = ? ${searchFilter} LIMIT ? OFFSET ?`,
            [tenantId, ...searchParams, limit, offset]
        );

        res.json(paginatedResponse(rows, total, page, limit));
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

        // 🛡️ VALIDACIÓN: Email y Password requeridos (Bug 3)
        if (!email || !password) {
            return res.status(400).json({ ok: false, error: 'Email y contraseña son obligatorios' });
        }

        // 🛡️ SEGURIDAD: Verificar duplicados (Bug 2)
        const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ ok: false, error: 'El correo electrónico ya está registrado en el sistema' });
        }

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

        // Enviar correo de bienvenida al nuevo usuario (No bloqueante)
        emailService.sendWelcomeEmail(email, nombre).catch(err => console.error('Error enviando bienvenida manual:', err));

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

        // Si cambió el estado del usuario, invalidar su caché de autenticación
        invalidateUserCache(parseInt(id));

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

        // Forzar cierre de sesión inmediato del usuario desactivado
        invalidateUserCache(parseInt(id));

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

        // 🛡️ RECURSOS: Borrar foto anterior para no llenar el disco (Bug 8)
        if (target[0].foto_url && target[0].foto_url.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '../../', target[0].foto_url);
            if (fs.existsSync(oldPath)) {
                fs.unlink(oldPath, (err) => { if (err) console.error('Error al borrar foto vieja:', err); });
            }
        }

        await db.query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [photoUrl, id]);

        // Audit Log
        await logAction(req.user.id, 'Subir Foto', 'Usuarios', { target_id: id, photoUrl }, req.ip);

        res.json({ ok: true, photoUrl });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
