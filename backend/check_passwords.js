const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

async function run() {
    console.log("Testing hashing and updating DB to an explicit salt and hash...");
    
    const password = 'Passly@2025*';
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log("New hash manually created:", hash);
    const verify = await bcrypt.compare(password, hash);
    console.log("Does it verify? ", verify);
    
    // Conectar a BD
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME, 
        port: process.env.DB_PORT, 
        ssl:{rejectUnauthorized:false}
    });

    await conn.query('UPDATE usuarios SET password = ?', [hash]);
    console.log('Update complete.');
    conn.end();
}
run();
