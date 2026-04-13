/**
 * @file equipo.controller.js
 * @description Controlador para la gestión de Equipos Tecnológicos (laptops, tablets, cámaras, etc.).
 * Esta tabla es independiente de `dispositivos` (vehículos), eliminando la ambigüedad del campo
 * `medio_transporte_id = NULL` que se usaba antes como discriminador.
 */

const { pool: db } = require('../config/db');
const { logAction } = require('../utils/logger');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const statsController = require('./stats.controller');

/**
 * Obtiene todos los equipos tecnológicos de la organización del usuario autenticado.
 * @route GET /api/equipos
 */
exports.getAllEquipos = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const { page, limit, offset } = getPagination(req.query, 20, 100);

        // Búsqueda server-side por nombre del equipo o serial
        const search = req.query.search ? `%${req.query.search}%` : null;
        let searchFilter = search ? 'AND (e.nombre LIKE ? OR e.serial LIKE ?)' : '';
        let searchParams = search ? [search, search] : [];

        const roleId = req.user.rol_id;
        const userId = req.user.id;
        const roleFilter = roleId === 2 ? 'AND e.usuario_id = ?' : '';
        
        if (roleId === 2) {
            searchParams.unshift(userId);
        }

        const [[{ total }]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM equipos e
            INNER JOIN usuarios u ON e.usuario_id = u.id
            WHERE u.cliente_id = ? ${roleFilter} ${searchFilter}
        `, [tenantId, ...searchParams]);

        const [rows] = await db.query(`
            SELECT e.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, u.foto_url AS usuario_foto
            FROM equipos e
            INNER JOIN usuarios u ON e.usuario_id = u.id
            WHERE u.cliente_id = ? ${roleFilter} ${searchFilter}
            ORDER BY e.created_at DESC
            LIMIT ? OFFSET ?
        `, [tenantId, ...searchParams, limit, offset]);

        res.json(paginatedResponse(rows, total, page, limit));
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * Crea un nuevo equipo tecnológico y lo asigna a un usuario.
 * @route POST /api/equipos
 */
exports.createEquipo = async (req, res) => {
    try {
        const { usuario_id, nombre, tipo, serial } = req.body;
        const tenantId = req.user.cliente_id;

        // Verificar que el usuario pertenezca a la misma organización
        const [userCheck] = await db.query('SELECT cliente_id FROM usuarios WHERE id = ?', [usuario_id]);
        if (userCheck.length === 0 || userCheck[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'Usuario no pertenece a su organización' });
        }

        const [result] = await db.query(
            'INSERT INTO equipos (usuario_id, nombre, tipo, serial, estado_id) VALUES (?, ?, ?, ?, 1)',
            [usuario_id, nombre, tipo || 'General', serial || null]
        );

        await logAction(req.user.id, 'Registrar Equipo', 'Equipos', { nombre, tipo, serial, target_user: usuario_id }, req.ip);

        // Limpiar caché de estadísticas
        statsController.clearStatsCache(req.user.rol_id, req.user.id, tenantId);
        statsController.clearStatsCache(2, usuario_id, tenantId);

        require('../config/socket').getIO().emit('stats_update');

        res.status(201).json({ ok: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * Actualiza los datos de un equipo tecnológico.
 * @route PUT /api/equipos/:id
 */
exports.updateEquipo = async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id, nombre, tipo, serial, estado_id } = req.body;
        const tenantId = req.user.cliente_id;

        // Verificar que el equipo pertenezca a la organización
        const [check] = await db.query(`
            SELECT u.cliente_id FROM equipos e 
            JOIN usuarios u ON e.usuario_id = u.id 
            WHERE e.id = ?
        `, [id]);

        if (check.length === 0 || check[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'No autorizado para editar este equipo' });
        }

        await db.query(
            'UPDATE equipos SET usuario_id=?, nombre=?, tipo=?, serial=?, estado_id=? WHERE id=?',
            [usuario_id, nombre, tipo, serial, estado_id, id]
        );

        await logAction(req.user.id, 'Actualizar Equipo', 'Equipos', { equipo_id: id, nombre }, req.ip);

        statsController.clearStatsCache(req.user.rol_id, req.user.id, tenantId);
        if (usuario_id) statsController.clearStatsCache(2, usuario_id, tenantId);

        require('../config/socket').getIO().emit('stats_update');

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * Desactiva un equipo (soft delete: cambia estado a Inactivo).
 * @route DELETE /api/equipos/:id
 */
exports.deleteEquipo = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.cliente_id;

        const [check] = await db.query(`
            SELECT u.cliente_id FROM equipos e 
            JOIN usuarios u ON e.usuario_id = u.id 
            WHERE e.id = ?
        `, [id]);

        if (check.length === 0 || check[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'Acceso denegado' });
        }

        await db.query('UPDATE equipos SET estado_id = 2 WHERE id = ?', [id]);
        await logAction(req.user.id, 'Desactivar Equipo', 'Equipos', { equipo_id: id }, req.ip);

        statsController.clearStatsCache(req.user.rol_id, req.user.id, tenantId);

        require('../config/socket').getIO().emit('stats_update');

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
