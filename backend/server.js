const http = require('http');
const app = require('./src/app');
const { checkConnection } = require('./src/config/db');
const socketConfig = require('./src/config/socket');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

// Inicializar Socket.io
socketConfig.init(server);

// Programar Backups Automáticos (Todos los días a las 3:00 AM)
cron.schedule('0 3 * * *', () => {
        console.log('⏰ Ejecutando backup programado...');
        require('./src/utils/backup');
});

async function startServer() {
        server.listen(PORT, () => {
                console.log(`🚀 Server + WebSockets running on http://localhost:${PORT}`);
        });

        await checkConnection();
}

startServer();