const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { logAction } = require('../utils/logger');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { trackFailedAttempt, resetAttempts } = require('../middleware/ipBlocker');

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
            await trackFailedAttempt(req.ip);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Verificar rol (3rd credential)
        if (user.rol_id !== parseInt(rol_id)) {
            await trackFailedAttempt(req.ip);
            return res.status(401).json({ error: 'El rol seleccionado no coincide con su cuenta' });
        }

        // Verificar estado
        if (user.estado_id !== 1) { // 1 = Activo
            return res.status(403).json({ error: 'Usuario inactivo o bloqueado. Contacte al administrador.' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            await trackFailedAttempt(req.ip);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Login exitoso -> Resetear intentos de IP
        await resetAttempts(req.ip);

        // Audit Log
        await logAction(user.id, 'Inicio de Sesión', 'Seguridad', 'Intento de login exitoso', req.ip);

        // Check if MFA is enabled
        if (user.mfa_enabled) {
            // Generate a temporary JWT for MFA step
            const mfaToken = jwt.sign(
                { id: user.id, mfaPending: true },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({
                message: 'MFA_REQUIRED',
                mfaRequired: true,
                mfaToken
            });
        }

        // Generar JWT Final
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

exports.mfaSetup = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.query('SELECT email FROM usuarios WHERE id = ?', [userId]);
        const user = users[0];

        const secret = speakeasy.generateSecret({ name: `Passly (${user.email})` });
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Store secret temporarily (not enabled yet)
        await db.query('UPDATE usuarios SET mfa_secret = ? WHERE id = ?', [secret.base32, userId]);

        res.json({
            success: true,
            secret: secret.base32,
            qrCodeUrl
        });
    } catch (error) {
        console.error('MFA Setup error:', error);
        res.status(500).json({ error: 'Error al configurar MFA' });
    }
};

exports.mfaVerify = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        const [users] = await db.query('SELECT mfa_secret FROM usuarios WHERE id = ?', [userId]);
        const secret = users[0].mfa_secret;

        const isValid = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (isValid) {
            await db.query('UPDATE usuarios SET mfa_enabled = TRUE WHERE id = ?', [userId]);
            await logAction(userId, 'MFA Habilitado', 'Seguridad', 'MFA activado correctamente', req.ip);
            res.json({ success: true, message: 'MFA habilitado correctamente' });
        } else {
            res.status(400).json({ error: 'Código inválido' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar MFA' });
    }
};

exports.mfaLogin = async (req, res) => {
    try {
        const { mfaToken, code } = req.body;

        const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
        if (!decoded.mfaPending) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const [users] = await db.query('SELECT * FROM usuarios WHERE id = ?', [decoded.id]);
        const user = users[0];

        const isValid = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code
        });

        if (isValid) {
            const token = jwt.sign(
                { id: user.id, email: user.email, rol_id: user.rol_id, cliente_id: user.cliente_id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            await logAction(user.id, 'Login MFA Exitoso', 'Seguridad', 'MFA verificado', req.ip);

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
        } else {
            res.status(401).json({ error: 'Código MFA inválido' });
        }
    } catch (error) {
        res.status(401).json({ error: 'Token expirado o inválido' });
    }
};
