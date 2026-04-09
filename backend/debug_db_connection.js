const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testConnection() {
    console.log('--- Database Debugger ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);
    console.log('Port:', process.env.DB_PORT);
    console.log('SSL:', process.env.DB_SSL);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT) || 3306,
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: false
            } : null,
            connectTimeout: 10000
        });

        console.log('✅ Connection successful!');
        
        console.log('Checking tables...');
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables found:', tables.map(t => Object.values(t)[0]).join(', '));

        if (tables.length > 0) {
            const firstTable = Object.values(tables[0])[0];
            console.log(`Checking table: ${firstTable}`);
            const [columns] = await connection.query(`SHOW COLUMNS FROM ${firstTable}`);
            console.log(`Columns in ${firstTable}:`, columns.map(c => c.Field).join(', '));
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Connection FAILED!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        
        if (error.code === 'ETIMEDOUT') {
            console.log('Possible cause: Firewall blocking the connection or DB host is down.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('Possible cause: Invalid credentials (user or password).');
        } else if (error.code === 'ENOTFOUND') {
            console.log('Possible cause: DB Host not found in DNS.');
        }
    }
}

testConnection();
