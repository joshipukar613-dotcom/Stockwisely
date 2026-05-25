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
    const client = await pool.connect();
    try {
        console.log('Running Low Stock Query...');
        // This is the query from notificationsController.js getAlerts
        const res = await client.query(`
      WITH latest_stock AS (
        SELECT DISTINCT ON (product_code)
          product_code, description, balance_qty, created_at
        FROM stock_movements
        ORDER BY product_code, created_at DESC NULLS LAST
      )
      SELECT 
        ls.product_code, 
        ls.description, 
        ls.balance_qty,
        COALESCE(p.min_stock_level, 5) as min_stock_level,
        p.id as product_id
      FROM latest_stock ls
      JOIN products p ON ls.product_code = p.product_code
      WHERE ls.balance_qty <= COALESCE(p.min_stock_level, 5)
    `);
        console.log('Success! Rows:', res.rows.length);
    } catch (err) {
        console.error('QUERY FAILED:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
