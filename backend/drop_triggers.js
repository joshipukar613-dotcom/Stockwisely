const { pool } = require('./config/database');

async function dropTriggers() {
    try {
        await pool.query('DROP TRIGGER IF EXISTS trg_sales_items_stock ON sales_items');
        await pool.query('DROP TRIGGER IF EXISTS trg_purchase_items_stock ON purchase_items');
        console.log('Triggers dropped.');
    } catch (err) {
        console.error('Error dropping triggers:', err);
    } finally {
        pool.end();
    }
}

dropTriggers();
