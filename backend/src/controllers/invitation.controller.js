const { pool: db } = require('../config/db');
const jwt = require('jsonwebtoken');

/**
 * Genera un enlace de WhatsApp para compartir una invitación
 */
exports.shareByWhatsApp = async (req, res) => {
    try {
        const { guestName, token } = req.body;

        if (!guestName || !token) {
            return res.status(400).json({ ok: false, error: 'Nombre e invitación son requeridos' });
        }

        // En un entorno real, aquí podríamos usar una API de WhatsApp.
        // Por ahora generaremos el enlace "wa.me" para que el usuario comparta manualmente.

        const message = `Hola ${guestName}, te envío tu invitación de acceso para Passly. Puedes usar este código QR al llegar. %0A%0AEnlace de invitación: ${process.env.FRONTEND_URL}/guest.html?token=${token}`;

        const waLink = `https://api.whatsapp.com/send?text=${message}`;

        res.json({ ok: true, waLink });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * Registra una invitación en la BD (opcional, si queremos persistencia de invitados)
 */
exports.createInvitationLog = async (req, res) => {
    // ... logic to store invitation in a table
};
