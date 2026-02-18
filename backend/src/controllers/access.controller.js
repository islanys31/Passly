const { pool: db } = require('../config/db');

exports.getAllAccess = async (req, res) => {
    try {
        const tenantId = req.user.cliente_id;
        const [rows] = await db.query(`
            SELECT a.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.foto_url as usuario_foto, d.nombre as dispositivo_nombre 
            FROM accesos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            WHERE u.cliente_id = ?
            ORDER BY a.fecha_hora DESC
        `, [tenantId]);
        res.json({ ok: true, data: rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.logAccess = async (req, res) => {
    try {
        const { usuario_id, dispositivo_id, tipo } = req.body;
        const [result] = await db.query(
            'INSERT INTO accesos (usuario_id, dispositivo_id, tipo) VALUES (?, ?, ?)',
            [usuario_id || req.user.id, dispositivo_id || null, tipo || 'Entrada']
        );

        const [userData] = await db.query('SELECT nombre, apellido, foto_url FROM usuarios WHERE id = ?', [usuario_id || req.user.id]);
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

        res.json({
            ok: true,
            qr: qrImage,
            token: guestToken,
            expiresAt: new Date(Date.now() + expirationHours * 3600000).toLocaleString()
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

        // 1. Intentar decodificar como JWT (Invitado)
        try {
            const decoded = jwt.verify(scanData, process.env.JWT_SECRET);
            if (decoded.purpose === 'guest_access') {
                result = {
                    esInvitado: true,
                    nombre: decoded.guestName,
                    id: decoded.hostId, // Atribuir al host o sistema
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
                if (data.userId && data.intent === 'access_request') {
                    const [users] = await db.query('SELECT nombre, apellido, foto_url, estado_id FROM usuarios WHERE id = ?', [data.userId]);
                    if (users.length > 0) {
                        const u = users[0];
                        if (u.estado_id !== 1) return res.status(403).json({ ok: false, error: 'Usuario inactivo o bloqueado' });

                        result = {
                            esInvitado: false,
                            nombre: `${u.nombre} ${u.apellido}`,
                            id: data.userId,
                            foto: u.foto_url
                        };
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
