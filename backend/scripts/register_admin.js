const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function reg() {
    console.log('--- REGISTRO FORZADO DE ADMINISTRADOR ---');
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const hash = await bcrypt.hash('Passly@2025*', 10);
        
        // 1. Asegurar roles
        await db.query('INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES (1, "Administrador del Sistema", "Admin")');
        await db.query('INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES (2, "Residente / Usuario Regular", "Residente")');

        // 2. Insertar admin
        await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE password = ?, rol_id = 1, estado_id = 1',
            ['Admin', 'Passly', 'admin@gmail.com', hash, 1, 1, 1, hash]
        );

        console.log('✅ Admin admin@gmail.com creado/actualizado con éxito');
        await db.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
}

reg();
