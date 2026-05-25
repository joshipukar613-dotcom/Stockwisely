require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'stock_wisely',
});

async function applyMigration() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '003_add_notes_to_sales_master.sql'), 'utf8');
        console.log('Applying migration 003...');
        await client.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

applyMigration();
