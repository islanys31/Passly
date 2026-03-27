const { pool: db } = require('../src/config/db');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

async function runRealSeed() {
    try {
        console.log('🌱 Inicializando datos reales en la Base de Datos...');

        // Asegurar que las tablas auxiliares existan
        await db.query('INSERT IGNORE INTO estados (id, nombre) VALUES (1, "Activo"), (2, "Inactivo")');
        await db.query('INSERT IGNORE INTO roles (id, nombre_rol) VALUES (1, "Admin"), (2, "Usuario"), (3, "Seguridad")');
        await db.query('INSERT IGNORE INTO clientes (id, nombre_cliente) VALUES (1, "Institución S.A.")');
        await db.query('INSERT IGNORE INTO medios_transporte (id, nombre) VALUES (1, "Vehículo"), (2, "Peatonal")');

        const hash = await bcrypt.hash('Passly@2025*', 10);
        
        // Usuarios: id, nombre, apellido, email, password, rol_id, estado_id, cliente_id
        const users = [
            [1, 'Administrador', 'Root', 'admin_real@passly.com', hash, 1, 1, 1],
            [2, 'Residente', 'Ejemplo', 'residente_real@passly.com', hash, 2, 1, 1],
            [3, 'Vigilante', 'Portería', 'seguridad_real@passly.com', hash, 3, 1, 1]
        ];

        for (const u of users) {
            await db.query(`
                INSERT INTO usuarios (id, nombre, apellido, email, password, rol_id, estado_id, cliente_id) 
                VALUES (?,?,?,?,?,?,?,?) 
                ON DUPLICATE KEY UPDATE 
                nombre=VALUES(nombre), apellido=VALUES(apellido), password=VALUES(password), rol_id=VALUES(rol_id), estado_id=VALUES(estado_id), cliente_id=VALUES(cliente_id)
            `, u);
        }

        console.log('✅ Usuarios Maestros creados exitosamente!');
        console.log('🔑 Credenciales:');
        console.log('   - ADMIN: admin_real@passly.com / Passly@2025*');
        console.log('   - RESIDENTE: residente_real@passly.com / Passly@2025*');
        console.log('   - SEGURIDAD: seguridad_real@passly.com / Passly@2025*');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al insertar datos:', error);
        process.exit(1);
    }
}

runRealSeed();
