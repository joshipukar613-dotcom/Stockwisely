const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'stock_wisely',
});

async function run() {
    console.log('Connecting...');
    try {
        const client = await pool.connect();
        console.log('Connected.');

        const res = await client.query(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'stock_movements'
    `);
        console.log('Stock Movements Columns:', res.rows.map(r => r.column_name).join(', '));
        client.release();
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        pool.end();
    }
}

run();
