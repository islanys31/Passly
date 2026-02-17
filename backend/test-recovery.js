const { pool } = require('./src/config/db');

async function generateTestCode() {
    try {
        const code = '123456';
        const email = 'admin@gmail.com';
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            'INSERT INTO recovery_codes (email, code, expires_at) VALUES (?, ?, ?)',
            [email, code, expiresAt]
        );

        console.log('\n✅ Código de prueba generado exitosamente!\n');
        console.log('═══════════════════════════════════════════');
        console.log('📧 Email: admin@gmail.com');
        console.log('🔑 Código: 123456');
        console.log('⏰ Válido por: 15 minutos');
        console.log('═══════════════════════════════════════════\n');
        console.log('📋 PASOS PARA PROBAR:\n');
        console.log('1. Ve a http://localhost:3000');
        console.log('2. Haz 3 intentos fallidos de login');
        console.log('   (usa cualquier contraseña incorrecta)');
        console.log('3. Aparecerá el link "¿Olvidaste tu contraseña?"');
        console.log('4. Haz clic y escribe: admin@gmail.com');
        console.log('5. Haz clic en "Enviar Código"');
        console.log('6. Usa el código: 123456');
        console.log('7. Crea una nueva contraseña');
        console.log('   (ej: NuevaPass123!)');
        console.log('\n✨ ¡Listo para probar!\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

generateTestCode();
