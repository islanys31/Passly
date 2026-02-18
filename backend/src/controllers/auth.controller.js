const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { logAction } = require('../utils/logger');

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

        const { getIO } = require('../config/socket');
        getIO().emit('stats_update');

        res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, rol_id } = req.body;

        if (!email || !password || !rol_id) {
            return res.status(400).json({ error: 'Correo, contraseña y rol son obligatorios' });
        }

        // Buscar usuario
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Verificar rol (3ra credencial)
        if (user.rol_id !== parseInt(rol_id)) {
            return res.status(401).json({ error: 'El rol seleccionado no coincide con su cuenta' });
        }

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

        // Audit Log
        await logAction(user.id, 'Inicio de Sesión', 'Seguridad', 'Login exitoso', req.ip);

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol_id: user.rol_id,
                foto_url: user.foto_url
            }
        });

    } catch (error) {
        console.error('CRITICAL LOGIN ERROR:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
            return res.status(503).json({ error: 'La base de datos no está disponible. Por favor, asegúrate de que el servicio MySQL esté activo.' });
        }
        res.status(500).json({
            error: 'Error interno del servidor al iniciar sesión',
            debug: error.message // temporalmente para ver el error en el cliente
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });

        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            // Por seguridad, no revelamos si el email existe o no
            return res.json({ success: true, message: 'Si el correo está registrado, recibirás un código de recuperación.' });
        }

        const user = users[0];

        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Guardar código en la base de datos
        await db.query(
            'INSERT INTO recovery_codes (email, code, expires_at) VALUES (?, ?, ?)',
            [email, code, expiresAt]
        );

        // Enviar email
        const emailService = require('../services/email.service');
        const emailResult = await emailService.sendRecoveryCode(email, code, user.nombre);

        if (emailResult.success) {
            // Audit Log
            await logAction(user.id, 'Solicitud de Recuperación', 'Seguridad', 'Código enviado', req.ip);

            res.json({
                success: true,
                message: 'Código de recuperación enviado a tu correo electrónico.'
            });
        } else {
            res.status(500).json({
                error: 'No se pudo enviar el correo. Verifica la configuración del servidor de email.'
            });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Error al procesar solicitud de recuperación' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Email, código y nueva contraseña son obligatorios' });
        }

        // Buscar código válido
        const [codes] = await db.query(
            'SELECT * FROM recovery_codes WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, code]
        );

        if (codes.length === 0) {
            return res.status(400).json({ error: 'Código inválido o expirado' });
        }

        // Marcar código como usado
        await db.query('UPDATE recovery_codes SET used = TRUE WHERE id = ?', [codes[0].id]);

        // Obtener usuario
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Hash de la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar contraseña
        await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, users[0].id]);

        // Audit Log
        await logAction(users[0].id, 'Cambio de Contraseña', 'Seguridad', 'Contraseña restablecida por código', req.ip);

        // Enviar confirmación por email
        const emailService = require('../services/email.service');
        await emailService.sendPasswordChangeConfirmation(email, users[0].nombre);

        res.json({ success: true, message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
};
