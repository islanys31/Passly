const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    try {
        console.log('Connected to MySQL.');
        
        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`Database "${process.env.DB_NAME}" ensured.`);
        
        // Use the database
        await connection.query(`USE \`${process.env.DB_NAME}\``);
        
        // Read SQL file
        const sqlPath = path.join(__dirname, '..', 'database', 'passly.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Importing schema...');
        // We use multipleStatements: true so we can execute the whole file at once
        await connection.query(sql);
        console.log('Schema imported successfully.');

    } catch (error) {
        console.error('Error during import:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

importDB();
