const { pool } = require('../config/db');

const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT clave, valor, descripcion FROM configuracion_global');
        const settings = {};
        rows.forEach(r => settings[r.clave] = r.valor);
        res.json({ ok: true, data: settings, full: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, message: 'Error al obtener configuración' });
    }
};

const updateSettings = async (req, res) => {
    if (req.user.rol_id !== 1) {
        return res.status(403).json({ ok: false, message: 'No autorizado' });
    }

    try {
        const settings = req.body; // { clave: valor, ... }
        for (const [clave, valor] of Object.entries(settings)) {
            await pool.query('UPDATE configuracion_global SET valor = ? WHERE clave = ?', [valor, clave]);
        }
        res.json({ ok: true, message: 'Configuración actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, message: 'Error al actualizar configuración' });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
