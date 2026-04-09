/**
 * @file seed.js
 * @description Script de automatización para la "siembra" (seeding) de datos iniciales.
 * 
 * [ESTUDIO: ¿QUÉ ES EL SEEDING?]
 * El "seeding" es el proceso de poblar la base de datos con datos de prueba
 * automáticos al inicio de un proyecto.
 * 
 * ¿Por qué es útil?
 * 1. Rapidez: No tienes que crear usuarios a mano cada vez que reinicias la BD.
 * 2. Consistencia: Todos los desarrolladores trabajan con los mismos correos y claves.
 * 3. Demostración: Permite mostrar una aplicación con gráficas y registros reales
 *    desde el primer segundo.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool: db } = require('../config/db');
const bcrypt = require('bcrypt');

async function seed() {
    console.log('🌱 Iniciando protocolo de siembra de datos Passly...');

    try {
        /**
         * [ESTUDIO: SEGURIDAD EN SEEDING]
         * Generamos los hash de las contraseñas ANTES de insertarlos.
         * Usamos la misma lógica que en el registro real para que el login funcione.
         */
        const salt = await bcrypt.genSalt(10);
        const demoPassword = await bcrypt.hash('Passly@2025*', salt); // Clave estándar del proyecto

        // 1. DEFINICIÓN DE IDENTIDADES DE PRUEBA
        // Formato: [Nombre, Apellido, Email, Password, Cliente, Rol, Estado]
        const testUsers = [
            ['Juan', 'Perez', 'juan.perez@passly.com', demoPassword, 1, 2, 1],
            ['Maria', 'Lopez', 'maria.lopez@passly.com', demoPassword, 1, 2, 1],
            ['Carlos', 'Rodriguez', 'carlos.rod@passly.com', demoPassword, 1, 3, 1],
            ['Ana', 'Martinez', 'ana.mtz@passly.com', demoPassword, 1, 2, 1],
            ['Guardia', 'Turno 1', 'guardia1@passly.com', demoPassword, 1, 3, 1]
        ];

        console.log('Inserting identities...');
        for (const user of testUsers) {
            try {
                // 'INSERT IGNORE' evita errores si el correo ya existe
                await db.query(
                    'INSERT IGNORE INTO usuarios (nombre, apellido, email, password, cliente_id, rol_id, estado_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    user
                );
            } catch (e) { /* Usuario ya presente, saltar */ }
        }

        // Recuperar IDs generados para vincular activos y accesos
        const [users] = await db.query("SELECT id FROM usuarios WHERE cliente_id = 1 AND email != 'admin@gmail.com'");
        const userIds = users.map(u => u.id);

        if (userIds.length === 0) {
            console.log('❌ Fallo crítico: No hay usuarios base para vincular datos.');
            return;
        }

        // 2. ACTIVOS DE HARDWARE Y FLOTA
        // Vinculamos dispositivos y vehículos a los usuarios creados arriba
        const devices = [
            [userIds[0], 1, 'Mazda CX-5', 'ABC-123'],
            [userIds[1], 2, 'Yamaha R6', 'XYZ-789'],
            [userIds[2], 1, 'Toyota Corolla', 'GHI-456'],
            [userIds[3], 3, 'Bicicleta Trek', 'BIKE-001']
        ];

        console.log('Provisioning devices and vehicles...');
        for (const dev of devices) {
            try {
                await db.query(
                    'INSERT IGNORE INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico) VALUES (?, ?, ?, ?)',
                    dev
                );
            } catch (e) { }
        }

        // 3. GENERACIÓN DE HISTORIAL (LOGS)
        // Creamos 50 entradas de acceso aleatorias para que el Dashboard tenga gráficas "vivas"
        console.log('Generating artificial historical traffic...');
        const types = ['Entrada', 'Salida'];
        const observations = ['Ingreso normal', 'Salida autorizada', 'Visita técnica', 'Retorno de trabajo'];

        for (let i = 0; i < 50; i++) {
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const obs = observations[Math.floor(Math.random() * observations.length)];

            // Fecha aleatoria dentro de la última semana
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 7));
            date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

            await db.query(
                'INSERT INTO accesos (usuario_id, tipo, observaciones, fecha_hora) VALUES (?, ?, ?, ?)',
                [userId, type, obs, date]
            );
        }

        console.log('✅ PROTOCOLO DE SIEMBRA COMPLETADO EXITOSAMENTE.');
        return true;
    } catch (error) {
        console.error('❌ ERROR DURANTE EL SEEDING:', error);
        throw error;
    }
}

// Exportar función principal para uso programático (Magic Login)
module.exports = { seed };

// Permitir ejecución directa desde CLI
if (require.main === module) {
    seed()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
