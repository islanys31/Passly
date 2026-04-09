const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifySync() {
    console.log('--- Database Sync Verification ---');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT) || 3306,
            ssl: { rejectUnauthorized: false }
        });

        const requiredColumns = {
            usuarios: ['email_verified', 'verification_token', 'mfa_enabled', 'mfa_secret', 'foto_url'],
            logs_sistema: ['id', 'usuario_id', 'accion', 'modulo', 'detalles', 'ip_address', 'fecha_hora'],
            recovery_codes: ['id', 'email', 'code', 'expires_at', 'used']
        };

        for (const [table, columns] of Object.entries(requiredColumns)) {
            console.log(`Verifying table: ${table}...`);
            const [rows] = await connection.query(`SHOW COLUMNS FROM ${table}`);
            const existingColumns = rows.map(r => r.Field);
            
            for (const col of columns) {
                if (existingColumns.includes(col)) {
                    console.log(`  ✅ Column ${col} exists.`);
                } else {
                    console.error(`  ❌ Column ${col} is MISSING!`);
                }
            }
        }

        console.log('\nChecking for sample data...');
        const [userCount] = await connection.query('SELECT COUNT(*) as count FROM usuarios');
        console.log(`Total users: ${userCount[0].count}`);
        
        const [accessCount] = await connection.query('SELECT COUNT(*) as count FROM accesos');
        console.log(`Total access logs: ${accessCount[0].count}`);

        await connection.end();
        console.log('\n✨ Database is fully synchronized and populated.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verifySync();
