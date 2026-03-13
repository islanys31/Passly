const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDB() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'passly',
            port: process.env.DB_PORT || 3306,
        });

        await pool.query(`
            CREATE TABLE IF NOT EXISTS equipos (
              id int(11) NOT NULL AUTO_INCREMENT,
              usuario_id int(11) NOT NULL,
              nombre varchar(100) NOT NULL,
              tipo varchar(50) DEFAULT 'General',
              serial varchar(100) DEFAULT NULL,
              estado_id int(11) DEFAULT 1,
              created_at timestamp NOT NULL DEFAULT current_timestamp(),
              updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (id),
              KEY usuario_id (usuario_id),
              KEY estado_id (estado_id),
              CONSTRAINT equipos_fk_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
              CONSTRAINT equipos_fk_estado FOREIGN KEY (estado_id) REFERENCES estados (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
        console.log("Tabla equipos creada con éxito (o ya existía).");
        process.exit(0);
    } catch (e) {
        console.error("Error creando tabla:", e);
        process.exit(1);
    }
}

fixDB();
