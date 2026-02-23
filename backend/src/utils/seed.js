const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');

async function seed() {
    console.log('🌱 Iniciando siembra de datos (Seeding)...');

    try {
        // 1. Limpiar datos previos opcionalmente (o solo insertar si no existen)
        // console.log('Cleaning existing data...');
        // await db.query('DELETE FROM accesos');
        // await db.query('DELETE FROM dispositivos');
        // await db.query('DELETE FROM usuarios WHERE email != "admin@gmail.com"');

        const salt = await bcrypt.genSalt(10);
        const demoPassword = await bcrypt.hash('Demo123!', salt);

        // 2. Insertar Usuarios de Prueba
        const testUsers = [
            ['Juan', 'Perez', 'juan.perez@gmail.com', demoPassword, 1, 2, 1],
            ['Maria', 'Lopez', 'maria.lopez@hotmail.com', demoPassword, 1, 2, 1],
            ['Carlos', 'Rodriguez', 'carlos.rod@gmail.com', demoPassword, 1, 3, 1],
            ['Ana', 'Martinez', 'ana.mtz@gmail.com', demoPassword, 1, 2, 1],
            ['Guardia', 'Turno 1', 'guardia1@gmail.com', demoPassword, 1, 3, 1]
        ];

        console.log('Inserting users...');
        for (const user of testUsers) {
            try {
                await db.query(
                    'INSERT IGNORE INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    user
                );
            } catch (e) { /* Ignore existing */ }
        }

        // Obtener IDs de usuarios insertados
        const [users] = await db.query('SELECT id FROM usuarios WHERE cliente_id = 1 AND email != "admin@gmail.com"');
        const userIds = users.map(u => u.id);

        if (userIds.length === 0) {
            console.log('❌ No users found to link data. Seed might have failed or users already exist.');
            process.exit(0);
        }

        // 3. Insertar Dispositivos
        const devices = [
            [userIds[0], 1, 'Mazda CX-5', 'ABC-123'],
            [userIds[1], 2, 'Yamaha R6', 'XYZ-789'],
            [userIds[2], 1, 'Toyota Corolla', 'GHI-456'],
            [userIds[3], 3, 'Bicicleta Trek', 'BIKE-001']
        ];

        console.log('Inserting devices...');
        for (const dev of devices) {
            try {
                await db.query(
                    'INSERT IGNORE INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico) VALUES (?, ?, ?, ?)',
                    dev
                );
            } catch (e) { /* Ignore existing */ }
        }

        // 4. Insertar Accesos Históricos (últimos 7 días)
        console.log('Inserting historical access logs...');
        const types = ['Entrada', 'Salida'];
        const observations = ['Ingreso normal', 'Salida autorizada', 'Visita técnica', 'Retorno de trabajo'];

        for (let i = 0; i < 50; i++) {
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const obs = observations[Math.floor(Math.random() * observations.length)];

            // Fecha aleatoria en los últimos 7 días
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 7));
            date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

            await db.query(
                'INSERT INTO accesos (usuario_id, tipo, observaciones, fecha_hora) VALUES (?, ?, ?, ?)',
                [userId, type, obs, date]
            );
        }

        console.log('✅ Seembra de datos completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante el Seeding:', error);
        process.exit(1);
    }
}

seed();
