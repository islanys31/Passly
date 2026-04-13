const { pool: db } = require('./src/config/db');
require('dotenv').config();

async function fixOrphans() {
    try {
        console.log('--- REPARACIÓN DE REGISTROS HUÉRFANOS ---');
        
        // 1. Identificar usuarios sin cliente_id
        const [orphans] = await db.query('SELECT id, email FROM usuarios WHERE cliente_id IS NULL');
        
        if (orphans.length === 0) {
            console.log('✅ No se encontraron usuarios huérfanos.');
            process.exit(0);
        }

        console.log(`🔍 Se encontraron ${orphans.length} usuarios sin sede. Asignando a Medellín (ID: 1)...`);
        
        // 2. Asignar todos los NULL a la Sede 1 (Medellín)
        const [result] = await db.query('UPDATE usuarios SET cliente_id = 1 WHERE cliente_id IS NULL');
        
        console.log(`✨ ÉXITO: ${result.affectedRows} identidades han sido recuperadas y asignadas a Medellín.`);
        
        // 3. También verificar vehículos o dispositivos que pudieran estar huérfanos (por si acaso)
        const [vResult] = await db.query('UPDATE dispositivos SET estado_id = 1 WHERE estado_id IS NULL');
        const [eResult] = await db.query('UPDATE equipos SET estado_id = 1 WHERE estado_id IS NULL');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error durante la reparación:', err.message);
        process.exit(1);
    }
}

fixOrphans();
