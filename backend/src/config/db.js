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
require('dotenv').config();               // Carga las variables de entorno del archivo .env

/**
 * CONFIGURACIÓN DEL POOL
 * Los datos se extraen de variables de entorno por SEGURIDAD.
 * Nunca guardes contraseñas directamente en el código (hardcoded).
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST,         // Dirección del servidor (ej. localhost)
    user: process.env.DB_USER,         // Usuario de la BD (ej. root)
    password: process.env.DB_PASSWORD, // Contraseña secreta
    database: process.env.DB_NAME,     // Nombre de la base de datos de Passly
    port: process.env.DB_PORT || 3306, // Puerto estándar de MySQL
    
    // Configuración avanzada de gestión:
    waitForConnections: true, // Si todas las conexiones están en uso, espera en lugar de dar error
    connectionLimit: 10,      // Máximo de conexiones simultáneas permitidas
    queueLimit: 0            // Sin límite de peticiones en espera (cola infinita)
});

/**
 * EXPORTACIÓN
 * Exportamos el pool para que los controladores puedan importar 'db' y realizar
 * consultas (queries) de forma asíncrona.
 */
module.exports = { pool };
