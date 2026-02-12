const { pool: db } = require('../config/db');

exports.getAllTransportModes = async (req, res) => {
    try {
        const [modes] = await db.query('SELECT * FROM medios_transporte');
        res.json(modes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener medios de transporte' });
    }
};
