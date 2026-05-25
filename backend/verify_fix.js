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
        console.log('1. Testing Dashboard Stock Alerts...');
        const dashboardRes = await client.query(`
        WITH latest_stock AS (
          SELECT DISTINCT ON (product_code)
            product_code,
            description,
            balance_qty,
            last_cost,
            extracted_month,
            min_stock_level
          FROM stock_movements
          ORDER BY product_code, extracted_month DESC NULLS LAST
        )
        SELECT 
          COUNT(*) FILTER (WHERE balance_qty <= min_stock_level AND balance_qty > 0)::bigint AS low_stock,
          COUNT(*) FILTER (WHERE balance_qty = 0)::bigint AS out_of_stock,
          COUNT(*)::bigint AS total_products
        FROM latest_stock
    `);
        console.log('Dashboard Stock Alerts: Parsed successfully. Rows:', dashboardRes.rows.length);

        console.log('2. Testing Notifications Low Stock Alerts...');
        const notifRes = await client.query(`
      WITH latest_stock AS (
        SELECT DISTINCT ON (product_code)
          product_code, description, balance_qty
        FROM stock_movements
        ORDER BY product_code, extracted_month DESC NULLS LAST
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
        console.log('Notifications Low Stock Alerts: Parsed successfully. Rows:', notifRes.rows.length);

        console.log('ALL TESTS PASSED!');
    } catch (err) {
        console.error('TEST FAILED:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
