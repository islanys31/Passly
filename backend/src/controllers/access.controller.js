const { pool: db } = require('../config/db');
const emailService = require('../services/email.service');
const { getPagination, paginatedResponse } = require('../utils/pagination');

exports.getAllAccess = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const { page, limit, offset } = getPagination(req.query, 20, 100);

        // Búsqueda server-side: filtra a nivel SQL, no client-side
        const search = req.query.search ? `%${req.query.search}%` : null;
        const searchFilter = search
            ? 'AND (u.nombre LIKE ? OR u.apellido LIKE ? OR a.tipo LIKE ?)'
            : '';
        const searchParams = search ? [search, search, search] : [];

        // COUNT total para los metadatos de paginación
        const [[{ total }]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE u.cliente_id = ? ${searchFilter}
        `, [tenantId, ...searchParams]);

        // Query paginada — solo trae las filas de la página solicitada
        const [rows] = await db.query(`
            SELECT a.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido,
                   u.foto_url as usuario_foto, d.nombre as dispositivo_nombre
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            WHERE u.cliente_id = ? ${searchFilter}
            ORDER BY a.fecha_hora DESC
            LIMIT ? OFFSET ?
        `, [tenantId, ...searchParams, limit, offset]);

        res.json(paginatedResponse(rows, total, page, limit));
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.logAccess = async (req, res) => {
    try {
        const { usuario_id, dispositivo_id, tipo } = req.body;
        const tenantId = req.user.cliente_id;

        // 🛡️ SEGURIDAD: Validar que el usuario pertenezca a la organización (Bug 4)
        const targetId = usuario_id || req.user.id;
        const [userCheck] = await db.query('SELECT cliente_id FROM usuarios WHERE id = ?', [targetId]);

        if (userCheck.length === 0 || userCheck[0].cliente_id !== tenantId) {
            return res.status(403).json({ ok: false, error: 'Acceso denegado: El usuario no pertenece a su organización' });
        }

        const [result] = await db.query(
            'INSERT INTO accesos (usuario_id, dispositivo_id, tipo) VALUES (?, ?, ?)',
            [targetId, dispositivo_id || null, tipo || 'Entrada']
        );

        const [userData] = await db.query('SELECT nombre, apellido, foto_url FROM usuarios WHERE id = ?', [targetId]);
        const user = userData[0];

        const io = require('../config/socket').getIO();
        io.emit('new_access', {
            id: result.insertId,
            tipo: tipo || 'Entrada',
            usuario_nombre: user?.nombre || 'Sistemas',
            usuario_apellido: user?.apellido || '',
            usuario_foto: user?.foto_url || null,
            fecha_hora: new Date()
        });
        io.emit('stats_update');

        res.status(201).json({ ok: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.generateAccessQR = async (req, res) => {
    try {
        const QRCode = require('qrcode');
        const userId = req.user.id;

        // Data segura para el QR
        const qrData = JSON.stringify({
            userId,
            intent: 'access_request',
            timestamp: Date.now(),
            service: 'Passly'
        });

        const qrImage = await QRCode.toDataURL(qrData, {
            color: {
                dark: '#2E7D32', // Verde Passly
                light: '#0000' // Transparente
            },
            width: 300,
            margin: 2
        });

        res.json({ ok: true, qr: qrImage });
    } catch (error) {
        console.error('QR Error:', error);
        res.status(500).json({ ok: false, error: 'Error al generar el código QR' });
    }
};

exports.createGuestInvitation = async (req, res) => {
    try {
        const QRCode = require('qrcode');
        const jwt = require('jsonwebtoken');
        const { guestName, expirationHours } = req.body;

        if (!guestName || !expirationHours) {
            return res.status(400).json({ ok: false, error: 'Nombre del invitado y tiempo de expiración son obligatorios' });
        }

        // Crear un token firmado para el invitado
        const guestToken = jwt.sign(
            {
                guestName,
                hostId: req.user.id,
                purpose: 'guest_access',
                version: 'v1'
            },
            process.env.JWT_SECRET,
            { expiresIn: `${expirationHours}h` }
        );

        // Generar el QR con el token
        const qrImage = await QRCode.toDataURL(guestToken, {
            color: {
                dark: '#2979FF', // Azul para Invitados
                light: '#0000'
            },
            width: 300,
            margin: 2
        });

        const expiresAt = new Date(Date.now() + expirationHours * 3600000);

        // Enviar correo si se proporciona guestEmail
        const { guestEmail } = req.body;
        if (guestEmail) {
            emailService.sendInvitationEmail(
                guestEmail,
                guestName,
                req.user.nombre,
                guestToken,
                expiresAt
            ).catch(err => console.error('Error enviando invitación por email:', err));
        }

        res.json({
            ok: true,
            qr: qrImage,
            token: guestToken,
            expiresAt: expiresAt.toLocaleString(),
            sentByEmail: !!guestEmail
        });
    } catch (error) {
        console.error('Invitation Error:', error);
        res.status(500).json({ ok: false, error: 'Error al crear la invitación' });
    }
};

exports.validateScan = async (req, res) => {
    try {
        const jwt = require('jsonwebtoken');
        const { scanData } = req.body;

        if (!scanData) return res.status(400).json({ ok: false, error: 'No hay datos de escaneo' });

        let result = null;
        let type = 'Entrada';

        const tenantId = req.user.cliente_id;

        // 1. Intentar decodificar como JWT (Invitado)
        try {
            const decoded = jwt.verify(scanData, process.env.JWT_SECRET);
            if (decoded.purpose === 'guest_access') {
                // 🛡️ SEGURIDAD: Validar que el anfitrión pertenezca a la organización del scanner
                const [hostCheck] = await db.query('SELECT cliente_id, estado_id FROM usuarios WHERE id = ?', [decoded.hostId]);

                if (hostCheck.length === 0 || hostCheck[0].cliente_id !== tenantId) {
                    return res.status(403).json({ ok: false, error: 'Invitación no válida para esta organización' });
                }

                if (hostCheck[0].estado_id !== 1) {
                    return res.status(403).json({ ok: false, error: 'El anfitrión de esta invitación ya no está autorizado' });
                }

                result = {
                    esInvitado: true,
                    nombre: decoded.guestName,
                    id: decoded.hostId, // Atribuir al host
                    foto: null
                };
            }
        } catch (e) {
            // No es un JWT válido o expiró
        }

        // 2. Si no es invitado, intentar como JSON de usuario permanente
        if (!result) {
            try {
                const data = JSON.parse(scanData);
                // 🛡️ SEGURIDAD: Validar TTL del QR Permanente (Bug 5) - Máximo 5 minutos
                const QR_TTL_MS = 5 * 60 * 1000;
                if (data.userId && data.intent === 'access_request') {
                    if (!data.timestamp || (Date.now() - data.timestamp > QR_TTL_MS)) {
                        return res.status(401).json({ ok: false, error: 'El código QR ha expirado (TTL 5 min). Genere uno nuevo.' });
                    }

                    // 🛡️ SEGURIDAD: Validar que el usuario pertenezca a la organización del scanner
                    const [users] = await db.query(
                        'SELECT nombre, apellido, foto_url, estado_id FROM usuarios WHERE id = ? AND cliente_id = ?',
                        [data.userId, tenantId]
                    );

                    if (users.length > 0) {
                        const u = users[0];
                        if (u.estado_id !== 1) return res.status(403).json({ ok: false, error: 'Usuario inactivo o bloqueado' });

                        result = {
                            esInvitado: false,
                            nombre: `${u.nombre} ${u.apellido}`,
                            id: data.userId,
                            foto: u.foto_url
                        };
                    } else {
                        return res.status(403).json({ ok: false, error: 'Este usuario no pertenece a su organización' });
                    }
                }
            } catch (e) { /* No es JSON */ }
        }

        if (!result) return res.status(404).json({ ok: false, error: 'QR no reconocido o inválido' });

        // 3. Registrar el acceso automáticamente
        const [insert] = await db.query(
            'INSERT INTO accesos (usuario_id, tipo, observaciones) VALUES (?, ?, ?)',
            [result.id, type, result.esInvitado ? `Acceso QR Invitado: ${result.nombre}` : 'Acceso QR Permanente']
        );

        // Notificar via Socket
        const io = require('../config/socket').getIO();
        io.emit('new_access', {
            id: insert.insertId,
            tipo: type,
            usuario_nombre: result.nombre,
            usuario_foto: result.foto,
            fecha_hora: new Date()
        });
        io.emit('stats_update');

        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};
