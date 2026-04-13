const { pool: db } = require('./src/config/db');
require('dotenv').config();

async function checkUsers() {
    try {
        console.log('--- DIAGNÓSTICO DE USUARIOS ---');
        const [users] = await db.query('SELECT id, email, rol_id, cliente_id, estado_id FROM usuarios');
        console.table(users);
        
        console.log('\n--- DIAGNÓSTICO DE CLIENTES ---');
        const [clients] = await db.query('SELECT id, nombre_cliente FROM clientes');
        console.table(clients);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkUsers();
