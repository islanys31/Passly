const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    try {
        const bearer = token.split(' ');
        const bearerToken = bearer[1];

        const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);

        // Seguridad: Evitar que tokens de recuperación se usen para sesión
        if (decoded.purpose === 'password_reset') {
            return res.status(401).json({ error: 'Unauthorized: Invalid token purpose' });
        }

        const { pool: db } = require('../config/db');
        const [users] = await db.query('SELECT estado_id FROM usuarios WHERE id = ?', [decoded.id]);

        if (users.length === 0 || users[0].estado_id !== 1) {
            return res.status(401).json({ error: 'Unauthorized: User is inactive or does not exist' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol_id)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { verifyToken, verifyRole };
