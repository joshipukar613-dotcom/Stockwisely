const { pool } = require('../config/database');

async function promote() {
    try {
        const email = 'joshipukar613@gmail.com';
        const res = await pool.query('UPDATE "User" SET role = $1 WHERE email = $2', ['ADMIN', email]);
        if (res.rowCount > 0) {
            console.log(`Successfully promoted ${email} to ADMIN.`);
        } else {
            console.log(`User ${email} not found.`);
        }
        process.exit(0);
    } catch (e) {
        console.error('Promotion error:', e);
        process.exit(1);
    }
}

promote();
