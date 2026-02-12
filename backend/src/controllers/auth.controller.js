const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { nombre, apellido, email, password, cliente_id, rol_id } = req.body;

        // Validaciones básicas
        if (!nombre || !apellido || !email || !password || !rol_id) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // Verificar si el usuario ya existe
        const [existingUser] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar usuario
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [nombre, apellido, email, hashedPassword, cliente_id || null, rol_id]
        );

        res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
        }

        // Buscar usuario
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Verificar estado
        if (user.estado_id !== 1) { // 1 = Activo
            return res.status(403).json({ error: 'Usuario inactivo o bloqueado. Contacte al administrador.' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, rol_id: user.rol_id, cliente_id: user.cliente_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol_id: user.rol_id
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });

        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            // Por seguridad, no decimos si el email existe o no
            return res.json({ message: 'Si el correo está registrado, recibirás instrucciones próximamente.' });
        }

        const user = users[0];

        // Generar token de recuperación (expira en 1 hora)
        const resetToken = jwt.sign(
            { id: user.id, purpose: 'password_reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // EN PRODUCCIÓN: Enviar resetToken por email
        // AQUÍ: Lo devolvemos para poder probar la integración
        res.json({
            message: 'Instrucciones enviadas',
            resetToken, // Solo para desarrollo/testeo
            instructions: 'Usa este token en la página de reset.html'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al procesar solicitud de recuperación' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.purpose !== 'password_reset') {
            return res.status(400).json({ error: 'Token inválido para este propósito' });
        }

        // Hash de la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar en la base de datos
        await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, decoded.id]);

        res.json({ message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'El enlace de recuperación ha expirado' });
        }
        res.status(401).json({ error: 'Token inválido' });
    }
};
