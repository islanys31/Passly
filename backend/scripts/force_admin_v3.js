const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

async function run() {
    console.log('Intento de conexión a DB...');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '127.0.0.1', // Forzar 127.0.0.1 en lugar de localhost
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'passly',
            port: process.env.DB_PORT || 3306,
            connectTimeout: 5000
        });

        console.log('✅ Conectado. Procesando Admin...');
        const hash = await bcrypt.hash('Passly@2025*', 10);
        
        // Insertar rol 1 si no existe
        await connection.query('INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES (1, "Administrador del Sistema", "Acceso total")');

        // Insertar o actualizar admin
        const [rows] = await connection.query('SELECT id FROM usuarios WHERE email = "admin@gmail.com"');
        
        if (rows.length > 0) {
            await connection.query('UPDATE usuarios SET password = ?, rol_id = 1, estado_id = 1 WHERE email = "admin@gmail.com"', [hash]);
            console.log('✅ Password de Admin actualizado.');
        } else {
            await connection.query(
                'INSERT INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['Admin', 'Passly', 'admin@gmail.com', hash, 1, 1, 1]
            );
            console.log('✅ Admin creado desde cero.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

run();
