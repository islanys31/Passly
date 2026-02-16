const mysql = require('mysql2/promise');
const ports = [3306, 3307, 3308];
const passwords = ['', 'root', '1234', '123456', '12345678', 'admin', 'password', 'passly', 'secret', 'change_this_root_password_123'];

async function probe() {
    for (const port of ports) {
        for (const password of passwords) {
            try {
                const conn = await mysql.createConnection({
                    host: '127.0.0.1',
                    user: 'root',
                    password: password,
                    port: port,
                    connectTimeout: 2000
                });
                console.log(`FOUND root! Port: ${port}, Password: "${password}"`);
                await conn.end();
                return;
            } catch (e) {
                // Keep trying
            }
            try {
                const conn = await mysql.createConnection({
                    host: '127.0.0.1',
                    user: 'passly_user',
                    password: password,
                    port: port,
                    connectTimeout: 2000
                });
                console.log(`FOUND passly_user! Port: ${port}, Password: "${password}"`);
                await conn.end();
                return;
            } catch (e) {
                // Keep trying
            }
        }
    }
    console.log('No valid connection found.');
}

probe();
