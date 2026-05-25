const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'stock_wisely',
});

(async () => {
    try {
        console.log('Checking sales_items columns...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'sales_items'
            ORDER BY ordinal_position
        `);

        console.log('\nColumns in sales_items:');
        result.rows.forEach(r => {
            console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
        });

        console.log('\n\nChecking purchase_items columns...');
        const result2 = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'purchase_items'
            ORDER BY ordinal_position
        `);

        console.log('\nColumns in purchase_items:');
        result2.rows.forEach(r => {
            console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
        });

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
