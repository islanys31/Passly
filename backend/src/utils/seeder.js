const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedDatabase() {
    console.log('🌱 Iniciando siembra de datos (Seeder)...');
    
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const passwordHash = await bcrypt.hash('SuperPass2026!', 10);
        
        // 1. Inyectar Usuarios
        const users = [
            { nombre: 'Michel', apellido: 'Residente', email: 'residente@passly.com', rol_id: 2 },
            { nombre: 'Islanys', apellido: 'Seguridad', email: 'seguridad@passly.com', rol_id: 3 }
        ];

        for (const u of users) {
            const [rows] = await conn.execute('SELECT id FROM usuarios WHERE email = ?', [u.email]);
            if (rows.length === 0) {
                await conn.execute(
                    'INSERT INTO usuarios (nombre, apellido, email, password, rol_id, estado_id, cliente_id) VALUES (?, ?, ?, ?, ?, 1, 1)',
                    [u.nombre, u.apellido, u.email, passwordHash, u.rol_id]
                );
                console.log(`✅ Usuario creado: ${u.email}`);
            }
        }

        // Obtener IDs de usuarios para data relacionada
        const [[resUser]] = await conn.execute('SELECT id FROM usuarios WHERE email = "residente@passly.com"');
        const resId = resUser.id;

        // 2. Inyectar Equipos (Dispositivos Tech)
        const equipos = [
            { nombre: 'MacBook Pro M2', tipo: 'Laptop', serial: 'APPLE-123456' },
            { nombre: 'iPad Pro 11"', tipo: 'Tablet', serial: 'IPAD-987654' }
        ];

        for (const e of equipos) {
            const [rows] = await conn.execute('SELECT id FROM equipos WHERE serial = ?', [e.serial]);
            if (rows.length === 0) {
                await conn.execute(
                    'INSERT INTO equipos (usuario_id, nombre, tipo, serial, estado_id) VALUES (?, ?, ?, ?, 1)',
                    [resId, e.nombre, e.tipo, e.serial]
                );
            }
        }
        console.log('✅ Equipos tecnológicos inyectados.');

        // 3. Inyectar Vehículos (Tabla dispositivos)
        const vehiculos = [
            { nombre: 'Mazda 3', uid: 'ABC-123', medio: 1 },
            { nombre: 'Toyota Corolla', uid: 'XYZ-789', medio: 1 },
            { nombre: 'Yamaha R6', uid: 'MT-009', medio: 2 }
        ];

        for (const v of vehiculos) {
            const [rows] = await conn.execute('SELECT id FROM dispositivos WHERE identificador_unico = ?', [v.uid]);
            if (rows.length === 0) {
                await conn.execute(
                    'INSERT INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id) VALUES (?, ?, ?, ?, 1)',
                    [resId, v.medio, v.nombre, v.uid]
                );
            }
        }
        console.log('✅ Parque automotor inyectado.');

        // 4. Inyectar Accesos (Logs)
        const [accessCheck] = await conn.execute('SELECT id FROM accesos LIMIT 1');
        if (accessCheck.length === 0) {
            const now = new Date();
            for (let i = 0; i < 10; i++) {
                const date = new Date(now);
                date.setHours(now.getHours() - i);
                await conn.execute(
                    'INSERT INTO accesos (usuario_id, tipo, observaciones, fecha_hora) VALUES (?, ?, ?, ?)',
                    [resId, i % 2 === 0 ? 'Entrada' : 'Salida', 'Acceso de prueba automatizado', date]
                );
            }
            console.log('✅ registros de acceso generados.');
        }

    } catch (e) {
        console.error('❌ Error en seeder:', e.message);
    } finally {
        await conn.end();
    }
}

module.exports = { seedDatabase };
