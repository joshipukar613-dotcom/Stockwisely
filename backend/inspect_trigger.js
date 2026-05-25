const { pool } = require('./config/database');

async function checkTrigger() {
    try {
        const res = await pool.query(`
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'trg_sales_items_stock'
    `);

        if (res.rows.length > 0) {
            console.log('--- FUNCTION DEFINITION ---');
            console.log(res.rows[0].def);
            console.log('---------------------------');
        } else {
            console.log('Function trg_sales_items_stock not found.');
        }

        const triggers = await pool.query(`
      SELECT tgname, tgrelid::regclass
      FROM pg_trigger
      WHERE tgname = 'trg_sales_items_stock'
    `);
        console.log('Triggers found:', triggers.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkTrigger();
