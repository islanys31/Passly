const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar .env manualmente desde el directorio actual
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ .env cargado desde:', envPath);
} else {
    console.error('❌ NO se encontró el archivo .env en:', envPath);
}

const { pool: db } = require('./src/config/db');

async function migrate() {
    try {
        console.log('🚀 Iniciando migración: Añadiendo columna tutorial_visto...');
        
        // 1. Verificar si la columna ya existe
        const [columns] = await db.query("SHOW COLUMNS FROM usuarios LIKE 'tutorial_visto'");
        
        if (columns.length === 0) {
            await db.query("ALTER TABLE usuarios ADD COLUMN tutorial_visto BOOLEAN DEFAULT FALSE");
            console.log('✅ Columna tutorial_visto añadida con éxito.');
        } else {
            console.log('ℹ️ La columna tutorial_visto ya existe.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

migrate();
