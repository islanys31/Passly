const { pool: db } = require('../config/db');
const jwt = require('jsonwebtoken');

/**
 * Genera un enlace de WhatsApp para compartir una invitación
 */
exports.shareByWhatsApp = async (req, res) => {
    try {
        const { guestName, token, phone } = req.body;

        if (!guestName || !token) {
            return res.status(400).json({ ok: false, error: 'Nombre e invitación son requeridos' });
        }

        const message = `👋 Hola ${guestName}, te envío tu invitación de acceso para Passly. Puedes usar este código QR al llegar.\n\n📍 Enlace de invitación: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest.html?token=${token}`;

        // Limpiar el número de teléfono (solo dígitos)
        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        
        // Usamos wa.me/{phone}?text=... para que abra directamente el chat
        const waLink = cleanPhone 
            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

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
