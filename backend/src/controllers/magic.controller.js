/**
 * @file magic.controller.js
 * @description Acceso rápido (Zero-Auth) para demostraciones y validación local.
 */

const { pool: db } = require('../config/db');
const jwt = require('jsonwebtoken');
const { seed } = require('../utils/seed');

/**
 * [ESTRATEGIA: MAGIC LOGIN]
 * Permite entrar al sistema sin contraseña. 
 * Ideal para presentaciones de emergencia o validación rápida de roles.
 */
exports.magicLogin = async (req, res) => {
    try {
        const targetRole = parseInt(req.query.role) || 1; // 1: Admin, 2: Residente (Local)
        
        console.log(`✨ MAGIC LOGIN ACTIVADO: Buscando slot para Rol ${targetRole}...`);

        let user = null;

        try {
            // 1. Intentar buscar en la base de datos real
            let [users] = await db.query('SELECT id, email, nombre, apellido, rol_id, cliente_id, foto_url FROM usuarios WHERE rol_id = ? AND estado_id = 1 LIMIT 1', [targetRole]);

            // 2. Si no hay usuarios, ejecutar seed
            if (users.length === 0) {
                console.log('🌱 Base de datos vacía. Ejecutando siembra...');
                await seed().catch(e => console.warn('Seed omitido:', e.message));
                [users] = await db.query('SELECT id, email, nombre, apellido, rol_id, cliente_id, foto_url FROM usuarios WHERE rol_id = ? AND estado_id = 1 LIMIT 1', [targetRole]);
            }

            if (users.length > 0) user = users[0];

        } catch (dbError) {
            console.error('⚠️ DB INACCESIBLE. Activando MODO NUCLEAR (Mock Data).');
            // MODO FALLBACK: Datos inyectados directamente si no hay Internet o DB
            const mockUsers = {
                1: { id: 999, nombre: 'Admin', apellido: 'Demo', email: 'admin@passly.com', rol_id: 1, cliente_id: 1 },
                2: { id: 888, nombre: 'Juan', apellido: 'Perez', email: 'juan.perez@passly.com', rol_id: 2, cliente_id: 1 },
                3: { id: 777, nombre: 'Guardia', apellido: 'Nocturno', email: 'guardia1@passly.com', rol_id: 3, cliente_id: 1 }
            };
            user = mockUsers[targetRole] || mockUsers[1];
            
            // Forzar carga de datos en caché para el middleware
            const { setUserInCache } = require('../middlewares/authMiddleware');
            setUserInCache(user.id, 1);
        }

        if (!user) {
            return res.status(500).send('<h1>Error Crítico</h1><p>No se pudo inicializar la identidad de demo.</p>');
        }

        // 3. Generar JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, rol_id: user.rol_id, cliente_id: user.cliente_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Configurar Cookie
        const isSecure = process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'None' : 'Lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log(`🚀 ACCESO CONCEDIDO (MODO ${user.id >= 888 ? 'OFFLINE' : 'ONLINE'}): ${user.nombre}`);

        // 5. Redirigir
        res.redirect(`/dashboard.html?magic=true&role=${targetRole}&token=${token}`);

    } catch (error) {
        console.error('❌ FALLO TOTAL:', error);
        res.status(500).send(`Error sistémico: ${error.message}`);
    }
};
