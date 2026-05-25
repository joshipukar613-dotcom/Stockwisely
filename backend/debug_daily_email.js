require('dotenv').config();
const { dailyDigest } = require('./services/AlertCheckerService');
const { pool } = require('./config/database');

async function run() {
    console.log('Triggering Daily Digest...');
    try {
        await dailyDigest();
        console.log('Daily Digest triggered successfully (emails queued if users enabled).');
        console.log('Exiting in 2 seconds...');
        setTimeout(() => process.exit(0), 2000);
    } catch (err) {
        console.error('FAILED:', err);
        process.exit(1);
    }
}

run();
