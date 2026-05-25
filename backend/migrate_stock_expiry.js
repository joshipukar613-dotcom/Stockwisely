const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stock_wisely',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    try {
        console.log("Running migration...");

        // Add min_stock_level to products
        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 5;
        `);
        console.log("Added min_stock_level to products.");

        // Add expiry_date to purchase_items
        await pool.query(`
            ALTER TABLE purchase_items 
            ADD COLUMN IF NOT EXISTS expiry_date DATE;
        `);
        console.log("Added expiry_date to purchase_items.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

runMigration();
