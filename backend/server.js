const http = require('http');
const app = require('./src/app');
const { initIO } = require('./src/config/socket');
const { scheduleBackups } = require('./src/utils/backup');

const server = http.createServer(app);
initIO(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    scheduleBackups();
});
