const { pool: db } = require('./src/config/db');

const migrate = async () => {
    console.log('🚀 Iniciando migración de tablas de seguridad...');
    try {
        // Tabla de Logs de Auditoría
        await db.query(`
            CREATE TABLE IF NOT EXISTS logs_sistema (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT,
                accion VARCHAR(100) NOT NULL,
                modulo VARCHAR(50) NOT NULL,
                detalles TEXT,
                ip_address VARCHAR(45),
                fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabla logs_sistema verificada.');

        // Tabla de intentos de login (para bloqueo por IP)
        await db.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                ip_address VARCHAR(45) PRIMARY KEY,
                attempts INT DEFAULT 0,
                last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Tabla login_attempts verificada.');

        // Columnas extras para usuarios (MFA) - ya deberían estar pero aseguramos
        await db.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS mfa_enabled TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255) DEFAULT NULL;
        `);
        console.log('✅ Columnas de usuario actualizadas.');

        console.log('🎉 Migración completada con éxito.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
};

migrate();
