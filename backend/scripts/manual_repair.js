const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

async function run() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'passly',
            port: process.env.DB_PORT || 3306
        });

        console.log('--- REPARACIÓN MANUAL PASO A PASO ---');

        const tryAlter = async (sql) => {
            try { await db.query(sql); console.log('✅ REPARADO: ' + sql); }
            catch (e) { console.log('ℹ️ OMITIDO (Ya existe o error): ' + sql); }
        };

        await tryAlter('ALTER TABLE usuarios ADD COLUMN nombre VARCHAR(100) AFTER id');
        await tryAlter('ALTER TABLE usuarios ADD COLUMN apellido VARCHAR(100) AFTER nombre');
        await tryAlter('ALTER TABLE usuarios ADD COLUMN rol_id INT DEFAULT 2 AFTER password');
        await tryAlter('ALTER TABLE usuarios ADD COLUMN estado_id INT DEFAULT 1');
        await tryAlter('ALTER TABLE usuarios ADD COLUMN cliente_id INT DEFAULT 1');

        console.log('✅ Columnas aseguradas. Insertando admin...');

        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash('Passly@2025*', 10);
        
        await db.query('INSERT IGNORE INTO roles (id, nombre) VALUES (1, "Administrador del Sistema")');
        
        await db.query(
            'REPLACE INTO usuarios (id, nombre, apellido, email, password, rol_id, estado_id, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [1, 'Admin', 'Passly', 'admin@gmail.com', hash, 1, 1, 1]
        );

        console.log('✅ Admin admin@gmail.com listo con ID 1 y Rol 1.');

    } catch (e) {
        console.error('❌ ERROR CRÍTICO:', e.message);
    } finally {
        if (db) await db.end();
        process.exit(0);
    }
}

run();
