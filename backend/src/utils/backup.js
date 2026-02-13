const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const fileName = `passly_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
const filePath = path.join(backupDir, fileName);

// Docker/Linux: use 'mysqldump' from PATH
// Windows: needs mysqldump in PATH or specify environment variable MYSQL_PATH
const mysqlBin = process.env.MYSQL_PATH || 'mysqldump';
const command = `${mysqlBin} -h ${process.env.DB_HOST} -u ${process.env.DB_USER} ${process.env.DB_PASSWORD ? `-p${process.env.DB_PASSWORD}` : ''} ${process.env.DB_NAME} > "${filePath}"`;

console.log(`Starting automated backup on host ${process.env.DB_HOST}...`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Backup Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Backup Status: ${stderr}`);
    }
    console.log(`Backup completed successfully: ${fileName}`);

    // Cleanup old backups (older than 7 days)
    const files = fs.readdirSync(backupDir);
    const now = new Date();
    files.forEach(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        if ((now - stats.mtime) > (7 * 24 * 60 * 60 * 1000)) {
            fs.unlinkSync(path.join(backupDir, file));
            console.log(`Cleaned up old backup: ${file}`);
        }
    });
});
