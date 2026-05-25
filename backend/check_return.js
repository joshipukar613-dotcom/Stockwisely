require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'stock_wisely',
});

async function checkLastReturn() {
    const client = await pool.connect();
    try {
        console.log('Checking last return...');
        const res = await client.query(`
            SELECT id, invoice_number, transaction_type, is_return, total_amount, notes, sale_date 
            FROM sales_master 
            WHERE transaction_type = 'return'
            ORDER BY id DESC 
            LIMIT 1
        `);

        if (res.rows.length > 0) {
            console.log('Return found:');
            console.table(res.rows);
            const ret = res.rows[0];
            if (ret.transaction_type === 'return' && Number(ret.total_amount) < 0) {
                console.log('PASS: Return recorded correctly.');
            } else {
                console.log('FAIL: Return recorded but data is incorrect.');
            }
        } else {
            console.log('FAIL: No return found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkLastReturn();
