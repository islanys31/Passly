/**
 * @file db.js
 * @description Configuración y gestión de la conexión a la base de datos MySQL.
 * 
 * [ESTRATEGIA DE ESTUDIO: EL POOL DE CONEXIONES]
 * En aplicaciones profesionales, no abrimos y cerramos una conexión por cada
 * usuario. En su lugar, usamos un "Pool" (estanque) de conexiones.
 * 
 * ¿Por qué usar un Pool?
 * 1. Rendimiento: Abrir una conexión es costoso en tiempo. El pool mantiene 
 *    varias abiertas y las "presta" cuando se necesitan.
 * 2. Escalabilidad: Evita que el servidor colapse por tener miles de conexiones abiertas
 *    simultáneamente, limitándolas a un número manejable (ej. 10).
 * 3. Gestión: Si una conexión falla, el pool se encarga de reponerla automáticamente.
 */

const mysql = require('mysql2/promise'); // Versión compatible con 'async/await' para código limpio
// NOTA: dotenv se carga SOLO en server.js. En producción (Render, Vercel, etc.)
// las variables ya están inyectadas en process.env por la plataforma.

/**
 * CONFIGURACIÓN DEL POOL
 * Los datos se extraen de variables de entorno por SEGURIDAD.
 * Nunca guardes contraseñas directamente en el código (hardcoded).
 */
// Log de diagnóstico para verificar variables en producción (sin exponer contraseñas)
console.log(`[DB Config] HOST=${process.env.DB_HOST} | PORT=${process.env.DB_PORT} | DB=${process.env.DB_NAME} | USER=${process.env.DB_USER} | SSL=${process.env.DB_SSL}`);

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    console.error('❌ CRÍTICO: Faltan variables de entorno de base de datos (DB_HOST, DB_USER o DB_NAME)');
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,         // Dirección del servidor (ej. localhost)
    user: process.env.DB_USER,         // Usuario de la BD (ej. root)
    password: process.env.DB_PASSWORD, // Contraseña secreta
    database: process.env.DB_NAME,     // Nombre de la base de datos de Passly
    port: parseInt(process.env.DB_PORT) || 3306, // Puerto - parseInt evita problemas de tipo string
    
    // Configuración de SSL (Requerido por Aiven y otros proveedores de nube)
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false // Permite certificados auto-firmados comunes en niveles gratuitos
    } : false,
    
    // Configuración avanzada de gestión:
    waitForConnections: true, // Si todas las conexiones están en uso, espera en lugar de dar error
    connectionLimit: 10,      // Reducido para respetar el límite de conexiones de Aiven (plan gratuito)
    queueLimit: 0             // Sin límite de peticiones en espera (cola infinita)
});

/**
 * EXPORTACIÓN
 * Exportamos el pool para que los controladores puedan importar 'db' y realizar
 * consultas (queries) de forma asíncrona.
 */
module.exports = { pool };
