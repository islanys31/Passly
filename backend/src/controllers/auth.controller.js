/**
 * @file auth.controller.js
 * @description Controlador de autenticación y seguridad.
 * Gestiona el registro de usuarios, inicio de sesión (Login), MFA (2FA) y recuperación de contraseña.
 * Incluye medidas de seguridad como bloqueo por IP, logs de auditoría y hashing con Bcrypt.
 */

const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { logAction } = require('../utils/logger'); // Utilidad para registrar logs de auditoría en la BD
const speakeasy = require('speakeasy');           // Librería para generación de secretos TOTP (MFA)
const QRCode = require('qrcode');                 // Para generar el código QR de configuración de MFA
const { trackFailedAttempt, resetAttempts } = require('../middleware/ipBlocker'); // Seguridad contra fuerza bruta
const emailService = require('../services/email.service'); // Servicio para notificaciones por correo

/**
 * Registra un nuevo usuario en el sistema.
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        const { nombre, apellido, email, password, cliente_id, rol_id } = req.body;

        // 1. Validaciones básicas de campos obligatorios
        if (!nombre || !apellido || !email || !password || !rol_id) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // 2. Verificar si el usuario ya existe para evitar duplicados
        const [existingUser] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // 3. SEGURIDAD: Encriptar la contraseña antes de guardarla (Hashing)
        // Usamos salt factor de 10 como estándar de seguridad.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Insertar el usuario en la base de datos (por defecto con estado 1 = Activo)
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [nombre, apellido, email, hashedPassword, cliente_id || null, rol_id]
        );

        // 5. Notificar al sistema para actualizar las estadísticas del Dashboard en tiempo real
        const { getIO } = require('../config/socket');
        getIO().emit('stats_update');

        // 6. Enviar correo de bienvenida (Proceso asíncrono no bloqueante)
        emailService.sendWelcomeEmail(email, nombre).catch(err => console.error('Error enviando bienvenida:', err));

        res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.insertId });
    } catch (error) {
        console.error('ERROR EN REGISTRO:', error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    }
};

/**
 * Cierra la sesión eliminando la cookie httpOnly del servidor.
 * El cliente (JS) no puede borrar cookies httpOnly por sí solo.
 * @route POST /api/auth/logout
 */
exports.logout = (req, res) => {
    const isSecure = process.env.HTTPS_ENABLED === 'true';
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'Strict' : 'Lax'
    });
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
};

/**
 * Inicio de sesión del usuario. Soporta MFA si está activado.
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password, rol_id } = req.body;

        if (!email || !password || !rol_id) {
            return res.status(400).json({ error: 'Correo, contraseña y rol son obligatorios' });
        }

        // 1. Buscar el usuario en la BD (solo los campos necesarios, no SELECT *)
        const [users] = await db.query(
            'SELECT id, email, password, nombre, apellido, rol_id, estado_id, cliente_id, mfa_enabled, mfa_secret, foto_url FROM usuarios WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            await trackFailedAttempt(req.ip); // Registra fallo para bloqueo por IP
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // 2. SEGURIDAD: Verificar que el rol seleccionado sea el correcto (Credential hacking prevention)
        if (user.rol_id !== parseInt(rol_id)) {
            await trackFailedAttempt(req.ip);
            return res.status(401).json({ error: 'El rol seleccionado no coincide con su cuenta' });
        }

        // 3. Verificar estado de la cuenta (Prevenir accesos de usuarios bloqueados)
        if (user.estado_id !== 1) { // 1 = Activo
            return res.status(403).json({ error: 'Usuario inactivo o bloqueado. Contacte al administrador.' });
        }

        // 4. SEGURIDAD: Comparar el hash de la contraseña proporcionada con el de la BD
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            await trackFailedAttempt(req.ip);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 5. Login exitoso -> Limpiar contadores de intentos fallidos
        await resetAttempts(req.ip);

        // 6. AUDITORÍA: Registrar el inicio de sesión exitoso
        await logAction(user.id, 'Inicio de Sesión', 'Seguridad', 'Intento de login exitoso', req.ip);

        /**
         * 7. PASO MFA: Si el usuario tiene 2FA habilitado, generamos un token temporal.
         * Este token tiene 'mfaPending: true' y solo es válido por 5 minutos para completar el segundo paso.
         */
        if (user.mfa_enabled) {
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

        /**
         * 8. GENERACIÓN DE JWT FINAL (Sin MFA o MFA ya verificado).
         * Contiene los claims necesarios para identificar al usuario en peticiones posteriores.
         */
        const token = jwt.sign(
            { id: user.id, email: user.email, rol_id: user.rol_id, cliente_id: user.cliente_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        /**
         * SEGURIDAD: Cookie httpOnly.
         * El token se guarda en una cookie httpOnly para que JavaScript del navegador
         * NO pueda acceder a él (protege contra ataques XSS).
         * - httpOnly: true  → inaccesible desde JS del cliente
         * - secure: true    → solo se envía por HTTPS (en producción)
         * - sameSite: Strict → no se envía en peticiones cross-site (protege contra CSRF)
         */
        const isSecure = process.env.HTTPS_ENABLED === 'true';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'Strict' : 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas en milisegundos
        });

        res.json({
            message: 'Login exitoso',
            token, // Se mantiene en body para compatibilidad con flujo MFA del frontend
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
        console.error('CRITICAL LOGIN ERROR:', error.message);
        if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
            return res.status(503).json({ error: 'Error de conexión con la base de datos.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
    }
};

/**
 * Solicita un código de recuperación de contraseña.
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });

        // SEGURIDAD: Solo traemos los campos necesarios, NO SELECT *
        const [users] = await db.query('SELECT id, nombre, estado_id FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            // SEGURIDAD: No revelamos que el correo no existe para evitar enumeración de usuarios
            return res.json({ success: true, message: 'Si el correo está registrado, recibirás un código de recuperación.' });
        }

        const user = users[0];

        // 1. Generar código aleatorio de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Válido por 15 minutos

        // 2. Guardar el código en una tabla dedicada con su expiración
        await db.query(
            'INSERT INTO recovery_codes (email, code, expires_at) VALUES (?, ?, ?)',
            [email, code, expiresAt]
        );

        // 3. Enviar el código por email utilizando el servicio de correos
        const emailResult = await emailService.sendRecoveryCode(email, code, user.nombre);

        if (emailResult.success) {
            await logAction(user.id, 'Solicitud de Recuperación', 'Seguridad', 'Código enviado', req.ip);
            res.json({ success: true, message: 'Código de recuperación enviado.' });
        } else {
            res.status(500).json({ error: 'No se pudo enviar el correo.' });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Error al procesar solicitud de recuperación' });
    }
};

/**
 * Restablece la contraseña utilizando un código de recuperación.
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // 1. Validar que el código exista, no haya sido usado y no esté expirado
        const [codes] = await db.query(
            'SELECT * FROM recovery_codes WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, code]
        );

        if (codes.length === 0) {
            return res.status(400).json({ error: 'Código inválido o expirado' });
        }

        // 2. SEGURIDAD: Inhabilitar el código inmediatamente después de su primer uso válido
        await db.query('UPDATE recovery_codes SET used = TRUE WHERE id = ?', [codes[0].id]);

        // 3. Hashing de la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Actualizar la contraseña en la tabla de usuarios
        await db.query('UPDATE usuarios SET password = ? WHERE email = ?', [hashedPassword, email]);

        // 5. AUDITORÍA: Registrar el cambio exitoso
        const [users] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        const userId = users.length > 0 ? users[0].id : null;
        await logAction(userId, 'Cambio de Contraseña', 'Seguridad', `Contraseña restablecida para ${email}`, req.ip);

        // 6. Enviar confirmación al usuario
        emailService.sendPasswordChangeConfirmation(email, email).catch(e => console.error(e));

        res.json({ success: true, message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
};

/**
 * Prepara la configuración de MFA (2FA) para un usuario autenticado.
 * @route GET /api/auth/mfa-setup
 */
exports.mfaSetup = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.query('SELECT email FROM usuarios WHERE id = ?', [userId]);
        const user = users[0];

        // 1. Generar secreto TOTP único para este usuario
        const secret = speakeasy.generateSecret({ name: `Passly (${user.email})` });

        // 2. Generar código QR para que el usuario lo escanee con Google Authenticator
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // 3. Guardar el secreto pero NO activar el MFA todavía (se requiere verificación primero)
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

/**
 * Verifica el código MFA para habilitar definitivamente la funcionalidad en la cuenta.
 * @route POST /api/auth/mfa-verify
 */
exports.mfaVerify = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        const [users] = await db.query('SELECT mfa_secret FROM usuarios WHERE id = ?', [userId]);
        const secret = users[0].mfa_secret;

        // 1. Validar el token enviado por el usuario con el secreto guardado
        const isValid = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (isValid) {
            // 2. Habilitar oficialmente el MFA en la cuenta
            await db.query('UPDATE usuarios SET mfa_enabled = TRUE WHERE id = ?', [userId]);
            await logAction(userId, 'MFA Habilitado', 'Seguridad', 'MFA activado correctamente', req.ip);

            // 3. Notificar por email sobre el cambio de seguridad importante
            emailService.sendSecurityAlert(req.user.email, req.user.nombre, 'MFA Activado', 'Has habilitado con éxito el 2FA en tu cuenta.').catch(e => console.error(e));

            res.json({ success: true, message: 'MFA habilitado correctamente' });
        } else {
            res.status(400).json({ error: 'Código de verificación incorrecto' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar MFA' });
    }
};

/**
 * Completa el inicio de sesión para usuarios con MFA activo.
 * @route POST /api/auth/mfa-login
 */
exports.mfaLogin = async (req, res) => {
    try {
        const { mfaToken, code } = req.body;

        // 1. Verificar el token temporal de MFA generado en el primer paso del login
        const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
        if (!decoded.mfaPending) {
            return res.status(401).json({ error: 'Token de MFA inválido' });
        }

        // Solo traemos los campos necesarios para generar el JWT y verificar el TOTP
        const [users] = await db.query(
            'SELECT id, email, nombre, apellido, rol_id, cliente_id, mfa_secret, foto_url FROM usuarios WHERE id = ?',
            [decoded.id]
        );
        const user = users[0];

        // 2. Verificar el código de 6 dígitos de la App contra el secreto del usuario
        const isValid = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code
        });

        if (isValid) {
            // 3. Generar el JWT final de sesión
            const token = jwt.sign(
                { id: user.id, email: user.email, rol_id: user.rol_id, cliente_id: user.cliente_id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            await logAction(user.id, 'Login MFA Exitoso', 'Seguridad', 'Verificación de segundo factor completa', req.ip);

            const isSecure = process.env.HTTPS_ENABLED === 'true';
            res.cookie('auth_token', token, {
                httpOnly: true,
                secure: isSecure,
                sameSite: isSecure ? 'Strict' : 'Lax',
                maxAge: 24 * 60 * 60 * 1000
            });

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
            res.status(401).json({ error: 'Código MFA incorrecto' });
        }
    } catch (error) {
        res.status(401).json({ error: 'Sesión de MFA expirada. Inicie sesión nuevamente.' });
    }
};
