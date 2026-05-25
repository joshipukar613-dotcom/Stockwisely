require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'stock_wisely',
});

async function checkRow() {
    const client = await pool.connect();
    try {
        console.log('Checking first row of stock_movements...');
        const res = await client.query(`SELECT * FROM stock_movements LIMIT 1`);
        if (res.rows.length > 0) {
            console.log(JSON.stringify(Object.keys(res.rows[0]).sort(), null, 2));
        } else {
            console.log('No rows found in stock_movements.');
            // If empty, check columns via information schema again but properly
            const res2 = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'stock_movements'
            `);
            const cols = res2.rows.map(r => r.column_name).sort();
            console.log('Columns from schema:', JSON.stringify(cols, null, 2));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkRow();
