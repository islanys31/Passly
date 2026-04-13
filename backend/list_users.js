const mysql = require('mysql2/promise');
require('dotenv').config();

async function listUsers() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: { rejectUnauthorized: false }
    });

    const [rows] = await conn.execute('SELECT id, nombre, email, rol_id FROM usuarios');
    console.log(JSON.stringify(rows, null, 2));

    await conn.end();
}

listUsers().catch(console.error);
