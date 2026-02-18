const { pool: db } = require('../config/db');

/**
 * Registra una acción administrativa en la base de datos
 * @param {number} usuario_id - ID del usuario que realiza la acción
 * @param {string} accion - Descripción de la acción (ej: 'Crear Usuario')
 * @param {string} modulo - Módulo afectado (ej: 'Usuarios')
 * @param {object|string} detalles - Detalles adicionales de la acción
 * @param {string} ip - Dirección IP del solicitante
 */
async function logAction(usuario_id, accion, modulo, detalles, ip = null) {
    try {
        const detallesStr = typeof detalles === 'object' ? JSON.stringify(detalles) : detalles;

        await db.query(
            'INSERT INTO logs_sistema (usuario_id, accion, modulo, detalles, ip_address) VALUES (?, ?, ?, ?, ?)',
            [usuario_id, accion, modulo, detallesStr, ip]
        );

        console.log(`[AUDIT LOG] ${modulo}: ${accion} by User ${usuario_id}`);
    } catch (error) {
        console.error('[AUDIT LOG ERROR]', error);
    }
}

module.exports = { logAction };
