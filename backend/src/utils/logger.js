/**
 * @file logger.js
 * @description Servicio de Auditoría Inmutable.
 * Este módulo se encarga de persistir en la base de datos cada acción crítica realizada
 * en el sistema, permitiendo un seguimiento forense de quién hizo qué, cuándo y desde dónde.
 */

const { pool: db } = require('../config/db');

/**
 * Registra una acción administrativa o de seguridad en la tabla logs_sistema.
 * 
 * @param {number|null} usuario_id - ID del usuario responsable (null si es el sistema/invitado)
 * @param {string} accion - Nombre corto de la acción (ej: 'Borrar Vehículo')
 * @param {string} modulo - Nombre del módulo afectado (ej: 'Inventario')
 * @param {object|string} detalles - Información detallada del cambio realizado
 * @param {string|null} ip - Dirección IP del cliente para rastreo geográfico/seguridad
 */
async function logAction(usuario_id, accion, modulo, detalles, ip = null) {
    try {
        // Normalizar los detalles a String si vienen en formato objeto
        const detallesStr = typeof detalles === 'object' ? JSON.stringify(detalles) : detalles;

        // Inserción en la base de datos
        await db.query(
            'INSERT INTO logs_sistema (usuario_id, accion, modulo, detalles, ip_address) VALUES (?, ?, ?, ?, ?)',
            [usuario_id, accion, modulo, detallesStr, ip]
        );

        // Feedback opcional en la consola del servidor para monitoreo en vivo
        console.log(`🛡️  [AUDITORÍA] Módulo: ${modulo} | Acción: ${accion} | IP: ${ip}`);
    } catch (error) {
        // Si falla el log, lo reportamos pero no bloqueamos la ejecución de la app
        console.error('❌ Error crítico al escribir en el Log de Auditoría:', error);
    }
}

module.exports = { logAction };
