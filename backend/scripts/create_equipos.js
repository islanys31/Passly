const { pool: db } = require('../src/config/db');
require('dotenv').config({ path: '../.env' });

async function createEquiposTable() {
    try {
        console.log('🚀 Creando tabla equipos si no existe...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`equipos\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`usuario_id\` int(11) NOT NULL,
                \`nombre\` varchar(100) NOT NULL,
                \`tipo\` varchar(50) DEFAULT 'General',
                \`serial\` varchar(100) DEFAULT NULL,
                \`estado_id\` int(11) DEFAULT 1,
                \`created_at\` timestamp DEFAULT current_timestamp(),
                \`updated_at\` timestamp DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (\`id\`),
                KEY \`usuario_id\` (\`usuario_id\`),
                KEY \`estado_id\` (\`estado_id\`),
                CONSTRAINT \`fk_equipos_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\` (\`id\`),
                CONSTRAINT \`fk_equipos_estado\` FOREIGN KEY (\`estado_id\`) REFERENCES \`estados\` (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
        console.log('✅ Tabla equipos lista.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error creando tabla equipos:', e);
        process.exit(1);
    }
}
createEquiposTable();
