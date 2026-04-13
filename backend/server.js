/**
 * @file server.js
 * @description Punto de entrada principal del servidor Passly.
 * Este archivo se encarga de inicializar el servidor HTTP, configurar WebSockets
 * y arrancar las tareas programadas como los backups.
 */

require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

// [ROBUSTEZ] Captura de errores no controlados para evitar que el servidor muera
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 RECHAZO NO MANEJADO:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('💥 EXCEPCIÓN NO CAPTURADA:', err);
});

const http = require('http');
const app = require('./src/app'); // Importa la aplicación Express configurada
const fs = require('fs');
const path = require('path');
const { initIO } = require('./src/config/socket'); // Importa el inicializador de Socket.IO
const { scheduleBackups } = require('./src/utils/backup'); // Tareas programadas de respaldo

// Crear carpeta de uploads/profiles si no existe
const profilesDir = path.join(__dirname, 'uploads/profiles');
if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
    console.log(`✅ Directorio creado: ${profilesDir}`);
}

/**
 * Crea el servidor HTTP utilizando la aplicación Express.
 * Se separa el servidor de la 'app' para permitir que Socket.IO corra sobre el mismo puerto.
 */
const server = http.createServer(app);

/**
 * Inicializa Socket.IO para permitir comunicación en tiempo real.
 * Se utiliza para actualizar el Dashboard instantáneamente cuando ocurre un acceso.
 */
initIO(server);

// Define el puerto del servidor (por defecto 3000 si no se encuentra en el .env)
const PORT = process.env.PORT || 3000;

/**
 * Arranca el servidor y escucha las peticiones entrantes.
 */
const { pool } = require('./src/config/db');

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ ERROR CRÍTICO: El puerto ${PORT} ya está en uso.`);
        console.log(`👉 Intenta cerrar otros procesos de Node.js o usa 'taskkill /F /IM node.exe'`);
        process.exit(1);
    }
});

/**
 * AUTO-MIGRACIÓN PASSLY PRO
 * Este bloque asegura que la base de datos tenga las columnas y roles necesarios
 * para las funciones avanzadas de marca blanca y super-administración.
 */
async function runProMigration() {
    try {
        console.log("🕵️ Chequeando esquema Passly Pro...");
        
        // 1. Columna logo_url en clientes
        const [columns] = await pool.query("SHOW COLUMNS FROM clientes LIKE 'logo_url'");
        if (columns.length === 0) {
            await pool.query("ALTER TABLE clientes ADD COLUMN logo_url VARCHAR(255) DEFAULT NULL;");
            console.log("✅ Sistema: Esquema de Clientes actualizado (logo_url).");
        }

        // 2. Rol Super Admin (ID 4)
        const [roles] = await pool.query("SELECT * FROM roles WHERE id = 4");
        if (roles.length === 0) {
            await pool.query("INSERT INTO roles (id, nombre_rol, descripcion) VALUES (4, 'Super Admin', 'Control maestro global');");
            console.log("✅ Sistema: Rol Super Admin habilitado.");
        }

        // 3. Crear Usuario Super Admin Maestro
        const [superAdmin] = await pool.query("SELECT * FROM usuarios WHERE email = 'superadmin@passly.com'");
        if (superAdmin.length === 0) {
            const bcrypt = require('bcrypt');
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash('SuperPass2026!', salt);
            await pool.query(
                "INSERT INTO usuarios (nombre, apellido, email, password, rol_id, cliente_id, estado_id) VALUES (?, ?, ?, ?, 4, 1, 1)",
                ['Super', 'Admin', 'superadmin@passly.com', hashed]
            );
            console.log("🔑 Sistema: Usuario Super Admin creado (superadmin@passly.com / SuperPass2026!)");
        }
    } catch (err) {
        console.warn("⚠️ Advertencia en migración Pro:", err.message);
    }
}

server.listen(PORT, '0.0.0.0', async () => {
    await runProMigration();
    
    // Inyección de Datos de Prueba (Seeder)
    const { seedDatabase } = require('./src/utils/seeder');
    await seedDatabase();

    try {
        // Prueba de conexión y [AUTO-REPAIR] de Tenants
        await pool.query('SELECT 1');
        console.log(`✅ CONEXIÓN A BASE DE DATOS: EXITOSA`);

        // REPARACIÓN: Vincular al admin y a todos los usuarios sin sede a Medellín (ID 1)
        const [repairResult] = await pool.query(`
            UPDATE usuarios 
            SET cliente_id = 1 
            WHERE email = 'michellmg775@gmail.com' 
               OR (cliente_id IS NULL AND email NOT LIKE '%@passly.com')
        `);
        if (repairResult.affectedRows > 0) {
            console.log(`🧹 AUTO-REPAIR: Se han vinculado ${repairResult.affectedRows} registros a Medellín.`);
        }
    } catch (err) {
        console.error(`❌ ERROR DE CONEXIÓN A DB: ${err.message}`);
        console.log(`👉 Revisa tu archivo .env (DB_HOST, DB_USER, DB_PASSWORD)`);
    }

    console.log(`===========================================`);
    console.log(`🚀 SERVIDOR PASSLY v2.0 EJECUTÁNDOSE`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🛡️  Estado: HARDENED (Seguridad Reforzada)`);
    console.log(`===========================================`);

    /**
     * Inicia la programación de backups de la base de datos.
     * Esto asegura que los datos estén protegidos automáticamente.
     */
    scheduleBackups();
});
