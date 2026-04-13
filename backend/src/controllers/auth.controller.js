/**
 * @file auth.controller.js
 * @description Centro neurálgico de la Identidad y Seguridad de Passly.
 * 
 * [ESTRATEGIA DE ESTUDIO: SEGURIDAD DE ACCESO]
 * Este controlador maneja los procesos más críticos:
 * 1. Registro: Cómo se guardan los usuarios de forma segura.
 * 2. Login: Cómo se verifican las credenciales sin comprometer la seguridad.
 * 3. MFA: Segundo factor de autenticación (2FA) para evitar robos de cuenta.
 * 4. Recuperación: Flujo seguro para resetear contraseñas olvidadas.
 */

const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt'); // Librería estándar para proteger contraseñas (No invertible)
const jwt = require('jsonwebtoken'); // Estándar para crear "pases de acceso" digitales (Tokens)
const { logAction } = require('../utils/logger'); // Registro de auditoría
const speakeasy = require('speakeasy');           // Generación de códigos MFA (TOTP)
const QRCode = require('qrcode');                 // Conversión de códigos a imagen QR
const { trackFailedAttempt, resetAttempts } = require('../middlewares/ipBlocker'); // Blindaje contra Fuerza Bruta
const emailService = require('../services/email.service'); // Notificaciones al usuario
const statsController = require('./stats.controller');

/**
 * REGISTRO DE USUARIO
 * Crea una nueva identidad en el sistema.
 */
exports.register = async (req, res) => {
    try {
        const { nombre, apellido, email, password, cliente_id, rol_id, secret_code } = req.body;

        console.log(`📝 INTENTO DE REGISTRO: ${email} (Rol ID: ${rol_id})`);

        // 1. Validaciones básicas: ¿Viene toda la información necesaria?
        if (!nombre || !apellido || !email || !password || !rol_id) {
            console.error('❌ REGISTRO FALLIDO: Faltan campos obligatorios');
            return res.status(400).json({ error: 'Todos los campos son obligatorios para el registro' });
        }

        // Blindaje de seguridad para la creación de Administradores (1) o Seguridad (3)
        const SECRET_AUTH_CODE = process.env.SECRET_AUTH_CODE || 'DOCENTES_2026';
        if (rol_id == 1 || rol_id == 3) {
            if (secret_code !== SECRET_AUTH_CODE) {
                console.error(`❌ REGISTRO RECHAZADO: Intentaron crear Rol ${rol_id} con código inválido`);
                return res.status(403).json({ error: 'Código especial de autorización inválido' });
            }
        }

        // 2. ¿El correo ya existe?
        const [existingUser] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            console.warn(`⚠️ REGISTRO RECHAZADO: El email ${email} ya existe`);
            return res.status(400).json({ error: 'Este correo electrónico ya se encuentra registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Generar Token de Verificación (Simplificado para 1 solo clic)
        const verificationToken = require('crypto').randomBytes(32).toString('hex');

        // 4. Guardar en la base de datos (email_verified = 0 por defecto)
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id, email_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)',
            [nombre, apellido, email, hashedPassword, cliente_id || null, rol_id, verificationToken]
        );

        console.log(`✅ USUARIO CREADO EXITOSAMENTE: ID ${result.insertId}`);

        // Actualizar estadísticas del Dashboard vía Sockets
        const { getIO } = require('../config/socket');
        statsController.clearStatsCache(rol_id, result.insertId, cliente_id || 1);
        getIO().emit('stats_update');

        // Enviar correo de verificación (Botón de un solo clic)
        const emailResult = await emailService.sendVerificationEmail(email, nombre, verificationToken);
        
        if (emailResult && !emailResult.success) {
            // AUTO-VERIFICAR: Si el correo no se pudo enviar, activar la cuenta automáticamente
            await db.query('UPDATE usuarios SET email_verified = 1, verification_token = NULL WHERE id = ?', [result.insertId]);
            console.log(`⚡ AUTO-VERIFICADO: Usuario ${result.insertId} (SMTP no disponible)`);
            
            res.status(201).json({ 
                message: 'Identidad creada y activada automáticamente (Email no configurado).', 
                userId: result.insertId
            });
        } else {
            res.status(201).json({ 
                message: 'Identidad creada. Por favor, verifique su correo para activar el acceso.', 
                userId: result.insertId 
            });
        }
    } catch (error) {
        console.error('💥 ERROR SISTÉMICO EN REGISTRO:', error);
        res.status(500).json({ error: `Error sistémico: ${error.message}` });
    }
};

/**
 * VERIFICACIÓN DE EMAIL (One-Click)
 * El usuario hace clic en el botón del correo y el sistema lo valida directamente.
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).send('Token de verificación no proporcionado.');

        // 1. Buscar usuario por token
        const [users] = await db.query('SELECT id, nombre, email FROM usuarios WHERE verification_token = ?', [token]);
        if (users.length === 0) {
            return res.status(400).send('El enlace de verificación es inválido o ya ha sido utilizado.');
        }

        const user = users[0];

        // 2. Marcar como verificado y limpiar el token
        await db.query('UPDATE usuarios SET email_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);

        // 3. Notificar éxito (Dashboard y Email final)
        emailService.sendWelcomeEmail(user.email, user.nombre).catch(e => {});
        
        // 4. Redirigir a la landing con mensaje de éxito
        res.redirect('/?verified=true');

    } catch (error) {
        console.error('ERROR VERIFICACION:', error);
        res.status(500).send('Fallo interno al procesar la verificación.');
    }
};

/**
 * LOGOUT (CIERRE DE SESIÓN)
 * Elimina la cookie del navegador para que el usuario no pueda seguir accediendo.
 */
exports.logout = (req, res) => {
    const isSecure = process.env.NODE_ENV === 'production' || process.env.HTTPS_ENABLED === 'true';
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'None' : 'Lax'
    });
    res.json({ success: true, message: 'La sesión se ha cerrado de forma segura' });
};

/**
 * LOGIN (INICIO DE SESIÓN)
 * El proceso más vigilado del sistema.
 */
exports.login = async (req, res) => {
    try {
        const { email, password, rol_id } = req.body;


        if (!email || !password || !rol_id) {
            return res.status(400).json({ error: 'Se requiere correo, contraseña y nivel de acceso' });
        }

        let user = null;

        try {
            // 1. Buscar al usuario en la base de datos real
            const [users] = await db.query(
                'SELECT id, email, password, nombre, apellido, rol_id, estado_id, cliente_id, mfa_enabled, mfa_secret, foto_url, email_verified FROM usuarios WHERE email = ?',
                [email]
            );

            if (users.length > 0) {
                user = users[0];
                
                // Blindaje de Rol
                if (user.rol_id !== parseInt(rol_id)) {
                    await trackFailedAttempt(req.ip);
                    return res.status(401).json({ error: 'Nivel de autorización incorrecto para esta identidad' });
                }

                // Verificar estado
                if (user.estado_id !== 1) {
                    return res.status(403).json({ error: 'Su acceso ha sido suspendido.' });
                }
            }
        } catch (dbError) {
            console.error('⚠️ LOGIN OFFLINE ACTIVADO: DB inaccesible');
            // MODO RESILIENCIA: Validar contra Mock Users si la DB está caída
            const mockUsers = {
                'admin@passly.com': { id: 999, email: 'admin@passly.com', password: 'Passly@2025*', nombre: 'Admin', apellido: 'Demo', rol_id: 1, estado_id: 1, cliente_id: 1, email_verified: 1 },
                'juan.perez@passly.com': { id: 888, email: 'juan.perez@passly.com', password: 'Passly@2025*', nombre: 'Juan', apellido: 'Perez', rol_id: 2, estado_id: 1, cliente_id: 1, email_verified: 1 }
            };

            const mockUser = mockUsers[email];
            if (mockUser && mockUser.rol_id === parseInt(rol_id)) {
                user = mockUser;
            }
        }

        if (!user) {
            await trackFailedAttempt(req.ip);
            return res.status(401).json({ error: 'Credenciales de acceso no válidas' });
        }

        if (user.email_verified !== 1) {
            return res.status(403).json({ error: 'Su cuenta aún no ha sido verificada. Revise su correo electrónico.' });
        }

        /**
         * [ESTUDIO: VERIFICACIÓN CON BCRYPT]
         * Si es un usuario de MOCK (Modo Offline), comparamos directamente.
         * Si es un usuario real, usamos bcrypt para comparar hashes.
         */
        let validPassword = false;
        if (user.id >= 888) {
            // Juan Perez o Admin Demo en modo offline
            validPassword = (password === 'Passly@2025*');
        } else {
            validPassword = await bcrypt.compare(password, user.password);
        }

        if (!validPassword) {
            await trackFailedAttempt(req.ip);
            return res.status(401).json({ error: 'Clave de acceso incorrecta' });
        }

        // Éxito -> Resetear intentos fallidos de esta IP
        await resetAttempts(req.ip);

        // Auditoría: Guardar quién entró y desde dónde
        await logAction(user.id, 'Inicio de Sesión', 'Seguridad', 'Login satisfactorio', req.ip);

        /**
         * [ESTUDIO: FLUJO MFA (2FA)]
         * Si el usuario activó la protección de 2 pasos, no le damos el acceso todavía.
         * Generamos un token "pendiente" que no sirve para nada más que para verificar el código.
         */
        if (user.mfa_enabled) {
            const mfaToken = jwt.sign(
                { id: user.id, mfaPending: true },
                process.env.JWT_SECRET,
                { expiresIn: '5m' } // Solo tiene 5 minutos para completar el 2FA
            );
            return res.json({
                message: 'MFA_REQUIRED',
                mfaRequired: true,
                mfaToken
            });
        }

        /**
         * [ESTUDIO: SESIONES CON COOKIES httpOnly]
         * Guardar el JWT en 'localStorage' es peligroso porque cualquier virus o script malicioso
         * en el navegador podría leerlo. 
         * Al guardarlo en una Cookie con 'httpOnly: true', JavaScript NO puede ver el token,
         * pero el navegador lo envía automáticamente al servidor en cada petición. 
         * ¡Es la forma más segura!
         */
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('CRITICAL: JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ error: 'Error de configuración del servidor (Missing Secret)' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, rol_id: user.rol_id, cliente_id: user.cliente_id },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const isSecure = process.env.NODE_ENV === 'production' || process.env.HTTPS_ENABLED === 'true';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'None' : 'Lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Acceso concedido',
            token, // Se devuelve en el JSON para compatibilidad de estados en el Cliente
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol_id: user.rol_id,
                cliente_id: user.cliente_id,
                foto_url: user.foto_url
            }
        });

    } catch (error) {
        console.error('ERROR LOGIN SISTÉMICO:', error.message);
        res.status(500).json({ error: 'Fallo crítico en el terminal de acceso' });
    }
};

/**
 * RECUPERACIÓN DE CONTRASEÑA: Solicitud
 * El usuario olvidó su clave y pide ayuda al sistema.
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'El correo electrónico es obligatorio' });

        // Buscar al usuario
        const [users] = await db.query('SELECT id, nombre, estado_id FROM usuarios WHERE email = ?', [email]);
        
        /**
         * [ESTUDIO: SEGURIDAD CONTRA ENUMERACIÓN]
         * Si el correo no existe, NO le decimos al usuario "Ese correo no existe".
         * Un atacante podría usar eso para saber quién tiene cuenta en Passly.
         * Respondemos siempre lo mismo: "Si el correo existe, recibirás el código".
         */
        if (users.length === 0) {
            return res.json({ success: true, message: 'Si el correo está registrado, recibirá instrucciones en breve.' });
        }

        const user = users[0];

        // 1. Generar código de un solo uso (OTP) de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Válido por 15 min

        // 2. Guardar el código temporal
        await db.query(
            'INSERT INTO recovery_codes (email, code, expires_at) VALUES (?, ?, ?)',
            [email, code, expiresAt]
        );

        // 3. Enviar el código por email
        const emailResult = await emailService.sendRecoveryCode(email, code, user.nombre);

        if (emailResult.success) {
            await logAction(user.id, 'Solicitud de Recuperación', 'Seguridad', 'Código OTP enviado', req.ip);
            res.json({ success: true, message: 'Código de autorización enviado a su bandeja.' });
        } else {
            res.status(500).json({ error: 'Fallo al despachar el correo electrónico.' });
        }

    } catch (error) {
        console.error('ERROR FORGOT PASS:', error);
        res.status(500).json({ error: 'Error interno en el módulo de recuperación' });
    }
};

/**
 * RECUPERACIÓN DE CONTRASEÑA: Ejecución
 * El usuario tiene el código y quiere establecer su nueva clave.
 */
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Todos los parámetros son obligatorios' });
        }

        // 1. Validar el código (Debe ser el correcto, no estar usado y no haber expirado)
        const [codes] = await db.query(
            'SELECT * FROM recovery_codes WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, code]
        );

        if (codes.length === 0) {
            return res.status(400).json({ error: 'Código de autorización inválido o caducado' });
        }

        // 2. Invalidad el código inmediatamente (Solo puede usarse UNA VEZ)
        await db.query('UPDATE recovery_codes SET used = TRUE WHERE id = ?', [codes[0].id]);

        // 3. Hashear la nueva contraseña (Seguridad)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Actualizar en la base de datos
        await db.query('UPDATE usuarios SET password = ? WHERE email = ?', [hashedPassword, email]);

        // Auditoría y Notificación
        const [users] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        const userId = users.length > 0 ? users[0].id : null;
        await logAction(userId, 'Cambio de Contraseña', 'Seguridad', `Reset de contraseña mediante OTP`, req.ip);
        
        emailService.sendPasswordChangeConfirmation(email, email).catch(e => {});

        res.json({ success: true, message: 'Sus credenciales han sido actualizadas con éxito' });

    } catch (error) {
        console.error('ERROR RESET PASS:', error);
        res.status(500).json({ error: 'Error al procesar el cambio de clave' });
    }
};

/**
 * CONFIGURACIÓN MFA (2FA)
 * Prepara el terreno para que el usuario active la protección de 2 pasos.
 */
exports.mfaSetup = async (req, res) => {
    try {
        const userId = req.user.id; // Obtenido del token JWT de sesión
        const [users] = await db.query('SELECT email FROM usuarios WHERE id = ?', [userId]);
        const user = users[0];

        /**
         * [ESTUDIO: ALGORITMO TOTP]
         * Speakeasy genera un "Secreto" (una cadena de texto aleatoria).
         * Este secreto se comparte entre el Servidor y la App de Autenticador.
         * Ambos usan ese secreto + la hora actual para generar el mismo código
         * de 6 dígitos cada 30 segundos.
         */
        const secret = speakeasy.generateSecret({ name: `Passly Control (${user.email})` });

        // Generar imagen QR para que el usuario NO tenga que escribir el secreto a mano
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Guardar el secreto pero todavía NO activar el MFA
        await db.query('UPDATE usuarios SET mfa_secret = ? WHERE id = ?', [secret.base32, userId]);

        res.json({
            success: true,
            secret: secret.base32,
            qrCodeUrl
        });
    } catch (error) {
        console.error('MFA SETUP ERROR:', error);
        res.status(500).json({ error: 'Fallo al inicializar protección 2FA' });
    }
};

/**
 * VERIFICACIÓN MFA: Activación Final
 * El usuario escaneó el QR y envía el código que ve en su móvil.
 */
exports.mfaVerify = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        const [users] = await db.query('SELECT mfa_secret FROM usuarios WHERE id = ?', [userId]);
        const secret = users[0].mfa_secret;

        // Validar si el código enviado es correcto para el secreto del usuario
        const isValid = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (isValid) {
            // Activar oficialmente el cerrojo digital
            await db.query('UPDATE usuarios SET mfa_enabled = TRUE WHERE id = ?', [userId]);
            await logAction(userId, 'MFA Habilitado', 'Seguridad', 'Activación de protección 2FA completada', req.ip);
            
            emailService.sendSecurityAlert(req.user.email, req.user.nombre, 'MFA Activado', 'Has blindado tu cuenta con éxito.').catch(e => {});

            res.json({ success: true, message: 'La protección de segundo factor está ahora ACTIVA' });
        } else {
            res.status(400).json({ error: 'El código de verificación es incorrecto o ha caducado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Fallo en la verificación de seguridad' });
    }
};

/**
 * MFA LOGIN: Segundo Paso del Inicio de Sesión
 * El usuario ya puso su contraseña, ahora pone el código de su App.
 */
exports.mfaLogin = async (req, res) => {
    try {
        const { mfaToken, code } = req.body;

        // 1. Validar el token temporal de "Espera de MFA"
        const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
        if (!decoded.mfaPending) {
            return res.status(401).json({ error: 'Protocolo de seguridad no autorizado' });
        }

        const [users] = await db.query(
            'SELECT id, email, nombre, apellido, rol_id, cliente_id, mfa_secret, foto_url FROM usuarios WHERE id = ?',
            [decoded.id]
        );
        const user = users[0];

        // 2. ¿El código de la App coincide con nuestro secreto?
        const isValid = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code
        });

        if (isValid) {
            // 3. TODO CORRECTO -> Generar pase de acceso final (JWT)
            const token = jwt.sign(
                { id: user.id, email: user.email, rol_id: user.rol_id, cliente_id: user.cliente_id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            await logAction(user.id, 'Login MFA Exitoso', 'Seguridad', 'Identidad confirmada mediante segundo factor', req.ip);

            const isSecure = process.env.NODE_ENV === 'production' || process.env.HTTPS_ENABLED === 'true';
            res.cookie('auth_token', token, {
                httpOnly: true,
                secure: isSecure,
                sameSite: isSecure ? 'None' : 'Lax',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.json({
                message: 'Autenticación completa',
                token,
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    apellido: user.apellido,
                    email: user.email,
                    rol_id: user.rol_id,
                    cliente_id: user.cliente_id,
                    foto_url: user.foto_url
                }
            });
        } else {
            res.status(401).json({ error: 'Código de seguridad incorrecto' });
        }
    } catch (error) {
        res.status(401).json({ error: 'La sesión de espera ha expirado. Repita el inicio de sesión.' });
    }
};
