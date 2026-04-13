const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedDatabase() {
    console.log('🌱 Iniciando siembra de datos optimizada...');
    
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
        
        // 1. Asegurar Clientes
        // Cliente 1 ya existe por defecto (DemoTech), crearemos un Cliente 2 para pruebas cruzadas
        const [clients] = await conn.execute('SELECT id FROM clientes WHERE id = 2');
        if (clients.length === 0) {
            await conn.execute("INSERT INTO clientes (id, nombre_cliente, contacto_email, estado_id) VALUES (2, 'SENA ADSO Medellín', 'medellin@sena.edu.co', 1)");
            console.log("✅ Cliente 2 creado.");
        }

        // 2. Inyectar / Actualizar Usuarios Administradores
        const admins = [
            { email: 'michellmg775@gmail.com', nombre: 'Michell', rol_id: 1, client_id: 1 },
            { email: 'admin2@passly.com', nombre: 'Admin Secundario', rol_id: 1, client_id: 2 }
        ];

        for (const a of admins) {
            const [rows] = await conn.execute('SELECT id FROM usuarios WHERE email = ?', [a.email]);
            if (rows.length === 0) {
                await conn.execute(
                    "INSERT INTO usuarios (nombre, apellido, email, password, rol_id, estado_id, cliente_id) VALUES (?, 'Admin', ?, ?, ?, 1, ?)",
                    [a.nombre, a.email, passwordHash, a.rol_id, a.client_id]
                );
                console.log(`✅ Admin inyectado: ${a.email}`);
            } else {
                // Asegurar que sea Admin si ya existía
                await conn.execute('UPDATE usuarios SET rol_id = 1, cliente_id = ? WHERE email = ?', [a.client_id, a.email]);
            }
        }

        // 3. Inyectar Residentes y Seguridad para el Cliente 1
        const staff = [
            { nombre: 'Michel', apellido: 'Residente', email: 'residente@passly.com', rol_id: 2, client_id: 1 },
            { nombre: 'Islanys', apellido: 'Seguridad', email: 'seguridad@passly.com', rol_id: 3, client_id: 1 }
        ];

        for (const s of staff) {
            const [rows] = await conn.execute('SELECT id FROM usuarios WHERE email = ?', [s.email]);
            if (rows.length === 0) {
                await conn.execute(
                    'INSERT INTO usuarios (nombre, apellido, email, password, rol_id, estado_id, cliente_id) VALUES (?, ?, ?, ?, ?, 1, ?)',
                    [s.nombre, s.apellido, s.email, passwordHash, s.rol_id, s.client_id]
                );
                console.log(`✅ Usuario inyectado: ${s.email}`);
            }
        }

        // Obtener ID del residente para asignarle datos
        const [[resUser]] = await conn.execute("SELECT id FROM usuarios WHERE email = 'residente@passly.com'");
        const resId = resUser.id;

        // 4. Inyectar Vehículos y Equipos (Para que se vean en el Dashboard)
        // Vehículos
        const vehiculos = [
            { nombre: 'Mazda CX-5', uid: 'MED-123', medio: 1 },
            { nombre: 'BMW S1000RR', uid: 'RR-999', medio: 2 }
        ];
        for (const v of vehiculos) {
            const [check] = await conn.execute('SELECT id FROM dispositivos WHERE identificador_unico = ?', [v.uid]);
            if (check.length === 0) {
                await conn.execute(
                    'INSERT INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id) VALUES (?, ?, ?, ?, 1)',
                    [resId, v.medio, v.nombre, v.uid]
                );
            }
        }

        // Equipos
        const equipos = [
            { nombre: 'MacBook Pro M3', tipo: 'Laptop', serial: 'SN-MED-001' },
            { nombre: 'DJI Mavic 3', tipo: 'Dron', serial: 'SN-FLY-777' }
        ];
        for (const e of equipos) {
            const [check] = await conn.execute('SELECT id FROM equipos WHERE serial = ?', [e.serial]);
            if (check.length === 0) {
                await conn.execute(
                    'INSERT INTO equipos (usuario_id, nombre, tipo, serial, estado_id) VALUES (?, ?, ?, ?, 1)',
                    [resId, e.nombre, e.tipo, e.serial]
                );
            }
        }

        // 5. Generar Logs de Hoy (Crucial para que los contadores no estén en 0)
        const day = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        await conn.execute('DELETE FROM accesos WHERE DATE(fecha_hora) = ?', [day]); // Limpiar para re-inyectar hoy
        
        for (let i = 0; i < 8; i++) {
            await conn.execute(
                'INSERT INTO accesos (usuario_id, tipo, observaciones, fecha_hora) VALUES (?, ?, ?, ?)',
                [resId, i % 2 === 0 ? 'Entrada' : 'Salida', 'Ingreso verificado por sistema', new Date()]
            );
        }
        
        // 6. REPARACIÓN: Asignar registros huérfanos a Medellín (ID 1)
        const [orphanResult] = await conn.execute('UPDATE usuarios SET cliente_id = 1 WHERE cliente_id IS NULL');
        if (orphanResult.affectedRows > 0) {
            console.log(`✅ REPARACIÓN: Se recuperaron ${orphanResult.affectedRows} identidades huérfanas.`);
        }
        
        console.log('🚀 SEEDING COMPLETADO: Sistema poblado para Medellín.');

    } catch (e) {
        console.error('❌ Error Crítico en Seeder:', e.message);
    } finally {
        await conn.end();
    }
}

module.exports = { seedDatabase };
