require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'stock_wisely',
});

async function checkRecentSales() {
    const client = await pool.connect();
    try {
        console.log('Checking recent sales_master entries (ID, Type, IsReturn, Amount)...');
        // Removed 'notes' column since it is missing
        const res = await client.query(`
            SELECT id, invoice_number, transaction_type, is_return, total_amount, sale_date 
            FROM sales_master 
            ORDER BY id DESC 
            LIMIT 10
        `);

        console.table(res.rows);

        const anomalies = res.rows.filter(r =>
            r.transaction_type === 'return' || r.total_amount < 0
        );

        if (anomalies.length > 0) {
            console.log('\nFound Returns:');
            console.table(anomalies);
        } else {
            console.log('\nNo returns found in last 10 records.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkRecentSales();
