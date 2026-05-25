const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'stock_wisely',
});

async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('stock_movements', 'products', 'sales_master')
    `);

        fs.writeFileSync('schema_dump.json', JSON.stringify(res.rows, null, 2));
        console.log('Schema dumped to schema_dump.json');
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
