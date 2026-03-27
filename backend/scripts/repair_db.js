const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function repair() {
    console.log('--- REPARACIÓN Y GARANTÍA DE IDENTIDAD PASSLY ---');
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'passly',
            port: process.env.DB_PORT || 3306,
            connectTimeout: 5000
        });

        console.log('✅ Conexión establecida.');

        // 1. REPARACIÓN ESTRUCTURAL: Asegurar columnas críticas
        const [columns] = await db.query('SHOW COLUMNS FROM usuarios');
        const colNames = columns.map(c => c.Field);
        
        if (!colNames.includes('nombre')) {
            console.log('🛠️ Añadiendo columna "nombre"...');
            await db.query('ALTER TABLE usuarios ADD COLUMN nombre VARCHAR(100) AFTER id');
        }
        if (!colNames.includes('apellido')) {
            console.log('🛠️ Añadiendo columna "apellido"...');
            await db.query('ALTER TABLE usuarios ADD COLUMN apellido VARCHAR(100) AFTER nombre');
        }
        if (!colNames.includes('rol_id')) {
            console.log('🛠️ Añadiendo columna "rol_id"...');
            await db.query('ALTER TABLE usuarios ADD COLUMN rol_id INT DEFAULT 2');
        }

        // 2. REPARACIÓN DE ROLES: Asegurar rol de Admin (1)
        await db.query('INSERT IGNORE INTO roles (id, nombre) VALUES (1, "Administrador del Sistema")');

        // 3. INSERCIÓN DE ADMIN FORZADO
        const hash = await bcrypt.hash('Passly@2025*', 10);
        await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, rol_id, estado_id, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE password = ?, rol_id = 1, estado_id = 1',
            ['Admin', 'Passly', 'admin@gmail.com', hash, 1, 1, 1, hash]
        );

        console.log('✅ Base de datos alineada y Admin registrado.');
    } catch (error) {
        console.error('❌ ERROR CRÍTICO:', error.message);
    } finally {
        if (db) await db.end();
        process.exit(0);
    }
}

repair();
