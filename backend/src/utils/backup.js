const cron = require('node-cron');
const scheduleBackups = () => {
    cron.schedule('0 0 * * *', () => {
        console.log('Daily backup check...');
    });
};
module.exports = { scheduleBackups };
