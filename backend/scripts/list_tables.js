const { pool } = require('../config/database');

async function listTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables found:', res.rows.map(r => r.table_name));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

listTables();
