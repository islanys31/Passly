const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function verify() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306
        });
        console.log('Connected to MySQL server.');

        const [rows] = await connection.query('SHOW DATABASES LIKE "passly"');
        if (rows.length > 0) {
            console.log('Database "passly" already exists.');
        } else {
            console.log('Database "passly" does not exist. Creating it...');
            await connection.query('CREATE DATABASE passly');
            console.log('Database "passly" created.');
        }
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verify();
