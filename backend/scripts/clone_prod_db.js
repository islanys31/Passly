const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Usa el entorno asumiendo ejecución en /backend/scripts

async function cloneDatabase() {
    const sourceDb = 'passly';
    const targetDb = 'passly_prod';

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });
        
        console.log(`Conectado a MySQL en ${process.env.DB_HOST || 'localhost'}`);
        
        // Verificar si la base de datos de origen existe
        const [rows] = await connection.query(`SHOW DATABASES LIKE "${sourceDb}"`);
        if (rows.length === 0) {
            console.error(`ERROR: La base de datos origen '${sourceDb}' no existe. Por favor, importala primero.`);
            process.exit(1);
        }

        // Crear base de datos de destino
        console.log(`Creando base de datos de destino: ${targetDb}...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${targetDb}`);
        
        // Obtener tablas de origen
        await connection.query(`USE ${sourceDb}`);
        const [tables] = await connection.query('SHOW TABLES');
        
        if (tables.length === 0) {
            console.log(`La base de datos ${sourceDb} está vacía. Nada que clonar.`);
            process.exit(0);
        }

        // Desactivar temporalmente revisión de llaves foráneas
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        await connection.query(`USE ${targetDb}`);

        for (const row of tables) {
            const tableName = Object.values(row)[0];
            console.log(`Clonando tabla: ${tableName}...`);
            
            // Eliminar si existe en destino
            await connection.query(`DROP TABLE IF EXISTS ${targetDb}.${tableName}`);
            
            // Recrear estructura y clonar datos copiando la tabla
            await connection.query(`CREATE TABLE ${targetDb}.${tableName} LIKE ${sourceDb}.${tableName}`);
            await connection.query(`INSERT INTO ${targetDb}.${tableName} SELECT * FROM ${sourceDb}.${tableName}`);
        }

        // Reactivar llaves foráneas
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log(`✅ Clonación completada con éxito. Base de datos '${targetDb}' lista para producción.`);
        await connection.end();
    } catch (error) {
        console.error('❌ Error general clonando base de datos:', error);
        process.exit(1);
    }
}

cloneDatabase();
