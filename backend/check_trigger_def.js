const { pool } = require('./config/database');

async function checkTrigger() {
    try {
        const res = await pool.query("SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'trg_sales_items_stock'");
        if (res.rows.length > 0) {
            console.log('--- FUNCTION DEFINITION ---');
            console.log(res.rows[0].def);
            console.log('---------------------------');
        } else {
            console.log('Function trg_sales_items_stock not found.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkTrigger();
