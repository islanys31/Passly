const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkLogs() {
    console.log('--- System Logs Checker ---');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT) || 3306,
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: false
            } : null
        });

        console.log('Fetching last 10 logs from logs_sistema...');
        const [logs] = await connection.query('SELECT * FROM logs_sistema ORDER BY fecha_hora DESC LIMIT 10');
        console.table(logs);

        console.log('\nChecking for failed login attempts...');
        const [failedAttempts] = await connection.query('SELECT * FROM login_attempts WHERE success = 0 ORDER BY attempt_time DESC LIMIT 5');
        console.table(failedAttempts);

        await connection.end();
    } catch (error) {
        console.error('❌ Error checking logs:', error.message);
    }
}

checkLogs();
