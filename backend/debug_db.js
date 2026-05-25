const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stock_wisely',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function debug() {
    try {
        console.log('--- Debugging Database Data ---');

    const vendorCount = await pool.query('SELECT COUNT(*) FROM vendors');
    console.log('Vendors Count:', vendorCount.rows[0].count);
    const vendors = await pool.query('SELECT id, name, contact_person, phone, email, is_active FROM vendors ORDER BY id DESC LIMIT 5');
    console.table(vendors.rows);

        const productCount = await pool.query('SELECT COUNT(*) FROM products');
        console.log('Products Count:', productCount.rows[0].count);

        const movementCount = await pool.query('SELECT COUNT(*) FROM stock_movements');
        console.log('Stock Movements Count:', movementCount.rows[0].count);

        console.log('\n--- Sample Products (Code, Desc) ---');
        const products = await pool.query('SELECT product_code, description FROM products LIMIT 5');
        console.table(products.rows);

        console.log('\n--- Sample Movements (Code, Desc) ---');
        const movements = await pool.query('SELECT product_code, description FROM stock_movements LIMIT 5');
        console.table(movements.rows);

        console.log('\n--- Check overlaps ---');
        const codeOverlap = await pool.query(`
      SELECT COUNT(*) FROM products p
      JOIN stock_movements sm ON p.product_code = sm.product_code
    `);
        console.log('Records matching by product_code:', codeOverlap.rows[0].count);

        const descOverlap = await pool.query(`
      SELECT COUNT(*) FROM products p
      JOIN stock_movements sm ON p.description = sm.description
    `);
        console.log('Records matching by description:', descOverlap.rows[0].count);

        console.log('\n--- Check Join for a specific product ---');
        if (products.rows.length > 0) {
            const code = products.rows[0].product_code;
            console.log(`Checking join for product: '${code}'`);
            const joinCheck = await pool.query(`
        SELECT * FROM stock_movements WHERE product_code = $1
      `, [code]);
            console.log(`Found ${joinCheck.rows.length} movement rows for this product.`);
            if (joinCheck.rows.length > 0) {
                console.log('Sample movement row:', joinCheck.rows[0]);
            }
        }

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        await pool.end();
    }
}

debug();
