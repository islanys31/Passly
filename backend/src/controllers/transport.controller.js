const { pool: db } = require('../config/db');

exports.getAllTransports = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM medios_transporte WHERE estado_id = 1');
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
