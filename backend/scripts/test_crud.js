const { pool: db } = require('../src/config/db');

async function testCRUD() {
    try {
        console.log('🧪 Probando CRUD de Hardware...');
        
        // Simular creación de un equipo (Hardware) por el Admin (id: 1)
        const [insertRes] = await db.query(
            "INSERT INTO equipos (usuario_id, nombre, tipo, serial, estado_id) VALUES (?, ?, ?, ?, 1)",
            [1, "Servidor de Pruebas", "Servidor", "SRV-TEST-001"]
        );
        console.log(`✅ Equipo creado con ID: ${insertRes.insertId}`);

        // Leer el equipo creado
        const [selectRes] = await db.query("SELECT * FROM equipos WHERE id = ?", [insertRes.insertId]);
        console.log("✅ Equipo leído de la BD:", selectRes[0].nombre);

        // Limpiar la prueba
        await db.query("DELETE FROM equipos WHERE id = ?", [insertRes.insertId]);
        console.log("🧹 Prueba limpiada correctamente");

        console.log("\n🧪 Probando CRUD de Flota (Vehículos)...");
        // Insertar en dispositivos (como vehículo)
        const [insertVehRes] = await db.query(
            "INSERT INTO dispositivos (usuario_id, medio_transporte_id, nombre, identificador_unico, estado_id) VALUES (?, ?, ?, ?, 1)",
            [2, 1, "Moto de Reparto", "MTO-001"]
        );
        console.log(`✅ Vehículo creado con ID: ${insertVehRes.insertId}`);

        // Leer
        const [selectVehRes] = await db.query("SELECT * FROM dispositivos WHERE id = ?", [insertVehRes.insertId]);
        console.log("✅ Vehículo leído de la BD:", selectVehRes[0].nombre);

         // Limpiar la prueba
         await db.query("DELETE FROM dispositivos WHERE id = ?", [insertVehRes.insertId]);
         console.log("🧹 Prueba limpiada correctamente");

        console.log("\n🎉 Pruebas CRUD superadas con éxito.");
    } catch (e) {
        console.error("❌ Fallo durante test CRUD:", e.message);
    } finally {
        process.exit(0);
    }
}

testCRUD();
