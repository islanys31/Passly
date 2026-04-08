/**
 * @file migrate.js
 * @description Script para subir las tablas locales de Passly a la nube de Aiven automáticamente.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log('🚀 Iniciando migración de Passly a la nube...');

    const connectionConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: { rejectUnauthorized: false },
        multipleStatements: true // Crucial para ejecutar todo el .sql de una vez
    };

    let connection;

    try {
        connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Conexión con Aiven establecida.');

        const sqlPath = path.join(__dirname, '../database/passly.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('⏳ Ejecutando scripts SQL... (Esto puede tomar unos segundos)');
        
        // Ejecutamos todo el archivo SQL
        await connection.query(sql);

        console.log('✨ ¡MIGRACIÓN EXITOSA! Todas las tablas han sido creadas en Aiven.');

    } catch (error) {
        console.error('💣 ERROR DURANTE LA MIGRACIÓN:');
        console.error(error.message);
        if (error.message.includes('Access denied')) {
            console.log('💡 Tip: Revisa que tu usuario y contraseña de Aiven sean correctos en el archivo .env');
        }
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

migrate();
