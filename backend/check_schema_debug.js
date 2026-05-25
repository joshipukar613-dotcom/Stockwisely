const { pool } = require('./config/database');

async function checkSchema() {
    const client = await pool.connect();
    try {
        const tables = ['sales_master', 'stock_movements', 'products', 'expiry_alerts', 'purchase_master'];

        for (const table of tables) {
            console.log(`\n--- ${table} ---`);
            const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);

            res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

checkSchema();
