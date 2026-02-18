const socketIo = require('socket.io');

let io;

const initIO = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        // console.log('Client connected:', socket.id);
        socket.on('disconnect', () => {
            // console.log('Client disconnected');
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initIO, getIO };
