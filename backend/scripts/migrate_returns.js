const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const runApprovedMigration = async () => {
    try {
        const migrationPath = path.join(__dirname, '../migrations/002_add_sales_returns.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🔄 Running approved returns migration...');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log('✅ Migration completed successfully!');

            // Verify tables
            const result = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('customer_credits', 'credit_transactions')
                ORDER BY table_name
            `);

            console.log('\n📊 Created Tables:');
            result.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

            // Verify columns in sales_master
            const colCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales_master' 
                AND column_name IN ('transaction_type', 'is_return', 'original_sale_id')
            `);
            console.log('\n🔍 New columns in sales_master:');
            colCheck.rows.forEach(row => console.log(`   ✓ ${row.column_name}`));

            // Test function
            const testNum = await client.query(`SELECT generate_return_number('sales_return') as num`);
            console.log('\n🧪 Test Return Number:', testNum.rows[0].num);

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

runApprovedMigration();
