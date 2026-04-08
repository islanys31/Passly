const { pool: db } = require('../src/config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function updateDatabase() {
    console.log('🚀 Iniciando actualización de base de datos...');

    try {
        // 1. Crear tabla de logs
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`logs_sistema\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`usuario_id\` int(11) DEFAULT NULL,
                \`accion\` varchar(255) NOT NULL,
                \`modulo\` varchar(100) NOT NULL,
                \`detalles\` text DEFAULT NULL,
                \`ip_address\` varchar(45) DEFAULT NULL,
                \`fecha_hora\` timestamp NOT NULL DEFAULT current_timestamp(),
                PRIMARY KEY (\`id\`),
                KEY \`usuario_id\` (\`usuario_id\`),
                CONSTRAINT \`logs_fk_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\` (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
        console.log('✅ Tabla logs_sistema lista.');

        // 2. Agregar columnas a usuarios
        const [columns] = await db.query('SHOW COLUMNS FROM usuarios');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('foto_url')) {
            await db.query('ALTER TABLE usuarios ADD COLUMN foto_url VARCHAR(255) DEFAULT NULL');
            console.log('✅ Columna foto_url añadida.');
        }

        if (!columnNames.includes('mfa_enabled')) {
            await db.query('ALTER TABLE usuarios ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE');
            console.log('✅ Columna mfa_enabled añadida.');
        }

        if (!columnNames.includes('mfa_secret')) {
            await db.query('ALTER TABLE usuarios ADD COLUMN mfa_secret VARCHAR(255) DEFAULT NULL');
            console.log('✅ Columna mfa_secret añadida.');
        }

        console.log('✨ Base de datos actualizada con éxito.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error actualizando base de datos:', error);
        process.exit(1);
    }
}

updateDatabase();
