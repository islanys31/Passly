const { pool: db } = require('../config/db');
const { logAction } = require('../utils/logger');
const { getPaginationParams } = require('../utils/pagination');

exports.getAll = async (req, res) => {
    try {
        const { limit, offset, searchFilter, searchParams } = getPaginationParams(req, 'nombre');
        
        const [totalRows] = await db.query(
            `SELECT COUNT(*) AS total FROM clientes WHERE estado_id = 1 ${searchFilter}`,
            searchParams
        );

        const [clientes] = await db.query(
            `SELECT id, nombre, telefono, email, direccion FROM clientes 
             WHERE estado_id = 1 ${searchFilter} 
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...searchParams, limit, offset]
        );

        res.json({
            data: clientes,
            pagination: {
                total: totalRows[0].total,
                page: parseInt(req.query.page) || 1,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al listar clientes' });
    }
};

exports.create = async (req, res) => {
    try {
        const { nombre, telefono, email, direccion } = req.body;
        if (!nombre) return res.status(400).json({ error: 'El nombre del cliente es requerido' });

        const [result] = await db.query(
            'INSERT INTO clientes (nombre, telefono, email, direccion, estado_id) VALUES (?, ?, ?, ?, 1)',
            [nombre, telefono || null, email || null, direccion || null]
        );

        await logAction(req.user.id, 'Creación de Cliente', 'Administración', `Se registró el cliente ${nombre}`, req.ip);
        
        res.status(201).json({ success: true, message: 'Cliente registrado correctamente', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear cliente' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono, email, direccion } = req.body;

        await db.query(
            'UPDATE clientes SET nombre = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?',
            [nombre, telefono, email, direccion, id]
        );

        await logAction(req.user.id, 'Actualización de Cliente', 'Administración', `Actualizado cliente ID ${id}`, req.ip);

        res.json({ success: true, message: 'Cliente actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
};

exports.deactivate = async (req, res) => {
    try {
        const { id } = req.params;
        if (id == 1) return res.status(400).json({ error: 'No se puede desactivar el cliente central de Passly' });

        await db.query('UPDATE clientes SET estado_id = 2 WHERE id = ?', [id]);
        
        await logAction(req.user.id, 'Desactivación Cliente', 'Administración', `Desactivado cliente ID ${id}`, req.ip);

        res.json({ success: true, message: 'Cliente desactivado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al desactivar cliente' });
    }
};

exports.updateLogo = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });

        const logoUrl = `/uploads/profiles/${req.file.filename}`; // Usando la misma carpeta por ahora

        await db.query('UPDATE clientes SET logo_url = ? WHERE id = ?', [logoUrl, id]);
        
        await logAction(req.user.id, 'Actualización Logo', 'Administración', `Actualizado logo de Cliente ID ${id}`, req.ip);

        res.json({ 
            success: true, 
            message: 'Logo actualizado correctamente',
            logo_url: logoUrl 
        });
    } catch (error) {
        console.error("Error al subir logo:", error);
        res.status(500).json({ error: 'Error interno al procesar el logo' });
    }
};
