const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

const checkDatabaseConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ Conexión exitosa a la base de datos MySQL');
        connection.release();
    } catch (error) {
        console.error('⚠️ Error al conectar con la base de datos:', error.message);
        // No lanzamos el error para evitar que el servidor se detenga
    }
};

module.exports = {
    pool: promisePool,
    checkConnection: checkDatabaseConnection
};
