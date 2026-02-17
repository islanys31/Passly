const { pool: db } = require('../config/db');

exports.getGeneralStats = async (req, res) => {
    try {
        // Usuarios activos
        const [users] = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 1');

        // Accesos hoy
        const [accesos] = await db.query('SELECT COUNT(*) as total FROM accesos WHERE DATE(fecha_hora) = CURDATE()');

        // Dispositivos activos
        const [dispositivos] = await db.query('SELECT COUNT(*) as total FROM dispositivos WHERE estado_id = 1');

        // Alertas: Usuarios bloqueados (estado_id = 4)
        const [bloqueados] = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE estado_id = 4');
        const alerts = bloqueados[0].total;

        res.json({
            success: true,
            stats: {
                usuariosActivos: users[0].total,
                accesosHoy: accesos[0].total,
                dispositivosActivos: dispositivos[0].total,
                alertas: alerts
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};
