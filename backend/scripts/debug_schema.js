const { pool } = require('../config/database');

async function debugSchema() {
    try {
        const res = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN ('User', 'sales_master') ORDER BY table_schema, table_name");
        console.log('--- Schema Debug ---');
        console.log(JSON.stringify(res.rows, null, 2));

        // Try querying both
        try {
            await pool.query('SELECT 1 FROM "User" LIMIT 1');
            console.log('Query "User" OK');
        } catch (e) { console.log('Query "User" FAIL:', e.message); }

        try {
            await pool.query('SELECT 1 FROM sales_master LIMIT 1');
            console.log('Query sales_master OK');
        } catch (e) { console.log('Query sales_master FAIL:', e.message); }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

debugSchema();
