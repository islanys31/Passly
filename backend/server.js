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

server.listen(PORT, '0.0.0.0', async () => {
    try {
        // Prueba de conexión a la base de datos
        await pool.query('SELECT 1');
        console.log(`✅ CONEXIÓN A BASE DE DATOS: EXITOSA`);
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
