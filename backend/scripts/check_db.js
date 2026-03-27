const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });
const mysql = require('mysql2/promise');

async function check() {
    console.log('--- DIAGNÓSTICO DE BASE DE DATOS ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('Database:', process.env.DB_NAME);
    console.log('User:', process.env.DB_USER);

    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const [rows] = await db.query('SELECT id, nombre, email, rol_id, estado_id FROM usuarios');
        console.log('Usuarios encontrados:', rows.length);
        console.table(rows);
        
        await db.end();
    } catch (error) {
        console.error('❌ ERROR AL CONECTAR:', error.message);
    }
}

check();
