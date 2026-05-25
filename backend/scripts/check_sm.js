const { pool } = require('../config/database');

async function checkSchema() {
    try {
        const res = await pool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_master' 
      ORDER BY column_name
    `);
        console.log('--- sales_master Schema ---');
        console.log(JSON.stringify(res.rows, null, 2));

        const countRes = await pool.query(`SELECT COUNT(*) FROM sales_master`);
        console.log('\nTotal sales in master:', countRes.rows[0].count);

    } catch (err) {
        console.error('Error fetching schema:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
