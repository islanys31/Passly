const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createUsers() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const password = await bcrypt.hash('Mortadela_1', 10);
    const users = [
        { email: 'michee0607_res@gmail.com', rol_id: 2, nombre: 'Michee', apellido: 'Residente' },
        { email: 'michee0607_seg@gmail.com', rol_id: 3, nombre: 'Michee', apellido: 'Seguridad' }
    ];

    for (const u of users) {
        try {
            const [rows] = await conn.execute('SELECT id FROM usuarios WHERE email = ?', [u.email]);
            if (rows.length === 0) {
                await conn.execute(
                    'INSERT INTO usuarios (nombre, apellido, email, password, rol_id, estado_id, email_verified) VALUES (?, ?, ?, ?, ?, 1, 1)',
                    [u.nombre, u.apellido, u.email, password, u.rol_id]
                );
                console.log(`✅ Creado: ${u.email} (Rol ${u.rol_id})`);
            } else {
                await conn.execute('UPDATE usuarios SET email_verified = 1, estado_id = 1 WHERE email = ?', [u.email]);
                console.log(`❕ Ya existe, verificado: ${u.email}`);
            }
        } catch (e) {
            console.error(`❌ Error en ${u.email}:`, e.message);
        }
    }

    await conn.end();
}

createUsers().catch(console.error);
